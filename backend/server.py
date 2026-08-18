from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import asyncio
import logging
import uuid
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone

from rf_engine import Pipeline, MODES, BANDS, DEFAULT_WEIGHTS
from emitter import GERMAN_ISM_BANDS, DEFAULT_EMITTER, build_sdr_config, SCHUMANN, WAVEFORMS, MODES as EMITTER_MODES

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="RF-Sensing Telemetry Server")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("rf-server")

# ---------------------------------------------------------------------------
# Globaler Zustand
# ---------------------------------------------------------------------------
pipeline = Pipeline()
SESSION_ID = str(uuid.uuid4())
_recent_frames: List[dict] = []   # rollender Puffer (In-Memory) für LLM & Charts
_persist_counter = 0


class ConnectionManager:
    def __init__(self):
        self.active: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)
        logger.info(f"Client verbunden. Aktiv: {len(self.active)}")

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)
        logger.info(f"Client getrennt. Aktiv: {len(self.active)}")

    async def broadcast(self, message: dict):
        dead = []
        payload = json.dumps(message)
        for ws in self.active:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()


# ---------------------------------------------------------------------------
# Hintergrund-Loop: 2x pro Sekunde Telemetry broadcasten + persistieren
# ---------------------------------------------------------------------------
async def telemetry_loop():
    global _persist_counter
    logger.info("Telemetry-Loop gestartet (2 Hz)")
    while True:
        try:
            frame = pipeline.step()
            frame["clients"] = len(manager.active)
            frame["session_id"] = SESSION_ID

            _recent_frames.append(frame)
            if len(_recent_frames) > 240:
                _recent_frames.pop(0)

            await manager.broadcast({"event": "telemetry", "data": frame})

            # Persistenz: jede Sekunde (jeder 2. Frame) in MongoDB
            _persist_counter += 1
            if _persist_counter % 2 == 0:
                doc = dict(frame)
                doc["_pk"] = str(uuid.uuid4())
                try:
                    await db.telemetry.insert_one(doc)
                except Exception as e:
                    logger.warning(f"Persist-Fehler: {e}")
        except Exception as e:
            logger.error(f"Loop-Fehler: {e}")
        await asyncio.sleep(0.5)


@app.on_event("startup")
async def on_startup():
    await db.telemetry.create_index("seq")
    await db.telemetry.create_index("session_id")
    # neue Session anlegen
    await db.sessions.insert_one({
        "session_id": SESSION_ID,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "mode": pipeline.state.mode,
    })
    asyncio.create_task(telemetry_loop())


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# ---------------------------------------------------------------------------
# WebSocket
# ---------------------------------------------------------------------------
@api_router.websocket("/ws/telemetry")
async def ws_telemetry(ws: WebSocket):
    await manager.connect(ws)
    try:
        # aktuellen Zustand direkt senden
        await ws.send_text(json.dumps({
            "event": "connected",
            "data": {
                "session_id": SESSION_ID,
                "mode": pipeline.state.mode,
                "band": pipeline.state.band,
                "weights": pipeline.state.weights,
            },
        }))
        while True:
            # Client-Nachrichten (z.B. Modus-Wechsel) entgegennehmen
            msg = await ws.receive_text()
            try:
                data = json.loads(msg)
                if data.get("action") == "set_mode":
                    pipeline.state.set_mode(data.get("mode", "normal"))
                elif data.get("action") == "set_band":
                    pipeline.state.set_band(data.get("band", "5G"))
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(ws)
    except Exception:
        manager.disconnect(ws)


# ---------------------------------------------------------------------------
# REST Endpunkte
# ---------------------------------------------------------------------------
class ModeInput(BaseModel):
    mode: str


class BandInput(BaseModel):
    band: str


class WeightsInput(BaseModel):
    presence: float
    motion: float
    signal: float
    stability: float


@api_router.get("/")
async def root():
    return {"message": "RF-Sensing Telemetry Server", "session_id": SESSION_ID}


@api_router.get("/config")
async def get_config():
    return {
        "mode": pipeline.state.mode,
        "band": pipeline.state.band,
        "weights": pipeline.state.weights,
        "modes": list(MODES),
        "bands": {k: v for k, v in BANDS.items()},
        "default_weights": DEFAULT_WEIGHTS,
        "session_id": SESSION_ID,
        "clients": len(manager.active),
    }


@api_router.post("/config/mode")
async def set_mode(inp: ModeInput):
    if inp.mode not in MODES:
        return {"ok": False, "error": "invalid mode"}
    pipeline.state.set_mode(inp.mode)
    await db.sessions.update_one({"session_id": SESSION_ID}, {"$set": {"mode": inp.mode}})
    await manager.broadcast({"event": "config", "data": {"mode": inp.mode}})
    return {"ok": True, "mode": inp.mode}


@api_router.post("/config/band")
async def set_band(inp: BandInput):
    if inp.band not in BANDS:
        return {"ok": False, "error": "invalid band"}
    pipeline.state.set_band(inp.band)
    return {"ok": True, "band": inp.band}


@api_router.post("/config/weights")
async def set_weights(inp: WeightsInput):
    pipeline.state.set_weights(inp.model_dump())
    return {"ok": True, "weights": pipeline.state.weights}


@api_router.get("/telemetry/latest")
async def latest():
    if _recent_frames:
        return _recent_frames[-1]
    return {}


@api_router.get("/telemetry/history")
async def history(limit: int = 100):
    docs = await db.telemetry.find({}, {"_id": 0, "_pk": 0}).sort("seq", -1).to_list(limit)
    return list(reversed(docs))


@api_router.get("/sessions")
async def sessions():
    docs = await db.sessions.find({}, {"_id": 0}).sort("started_at", -1).to_list(50)
    out = []
    for s in docs:
        count = await db.telemetry.count_documents({"session_id": s["session_id"]})
        s["frames"] = count
        out.append(s)
    return out


@api_router.get("/sessions/{session_id}/frames")
async def session_frames(session_id: str, limit: int = 400, light: int = 1):
    limit = max(1, min(limit, 5000))
    projection = {"_id": 0, "_pk": 0}
    if light:
        # CSI-Rohvektoren fürs Replay weglassen -> deutlich kleinere Payload
        projection["raw.signal.csi_amplitude"] = 0
        projection["raw.signal.csi_phase"] = 0
    docs = await db.telemetry.find(
        {"session_id": session_id}, projection
    ).sort("seq", 1).to_list(limit)
    return docs


# ---------------------------------------------------------------------------
# LLM Anomalie- / Insight-Analyse (Emergent LLM Key)
# ---------------------------------------------------------------------------
class InsightResponse(BaseModel):
    assessment: str
    severity: str
    generated_at: str


@api_router.post("/insights/analyze", response_model=InsightResponse)
async def analyze_insights():
    frames = _recent_frames[-20:]
    if not frames:
        return InsightResponse(assessment="Noch keine Telemetriedaten verfügbar.", severity="info",
                               generated_at=datetime.now(timezone.utc).isoformat())

    latest = frames[-1]
    summary = {
        "mode": latest["mode"],
        "band": latest["raw"]["signal"]["band_label"],
        "fusion_score": latest["fusion"]["score"],
        "fusion_state": latest["fusion"]["state"],
        "confidence": latest["confidence"],
        "models": {k: v["score"] for k, v in latest["models"].items()},
        "rssi": latest["raw"]["signal"]["rssi"],
        "snr": latest["raw"]["signal"]["snr"],
        "entities_detected": len(latest["entities"]),
        "recent_fusion_scores": [f["fusion"]["score"] for f in frames],
        "recent_confidence": [f["confidence"]["value"] for f in frames],
    }

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=os.environ["EMERGENT_LLM_KEY"],
            session_id=f"rf-insight-{SESSION_ID}",
            system_message=(
                "Du bist ein Analyse-Assistent für ein RF-/WiFi-Sensing-System (5G/LTE/UMTS/WiFi CSI). "
                "Du bewertest Telemetrie einer Sensing-Pipeline (Presence/Motion/Signal/Stability -> Fusion). "
                "Antworte NUR mit einem knappen deutschen Absatz (max 4 Sätze): beschreibe den aktuellen Zustand, "
                "auffällige Werte/Anomalien und eine Empfehlung. Danach in einer letzten Zeile exakt: 'SEVERITY: <low|medium|high>'."
            ),
        ).with_model("openai", "gpt-5.4")

        user_msg = UserMessage(text="Analysiere diese RF-Sensing-Telemetrie:\n" + json.dumps(summary, ensure_ascii=False))
        resp = await chat.send_message(user_msg)
        text = resp if isinstance(resp, str) else str(resp)

        severity = "low"
        assessment = text
        if "SEVERITY:" in text:
            parts = text.rsplit("SEVERITY:", 1)
            assessment = parts[0].strip()
            sev = parts[1].strip().lower()
            severity = "high" if "high" in sev else "medium" if "medium" in sev else "low"
        elif latest["mode"] == "anomaly":
            severity = "high"

        return InsightResponse(assessment=assessment, severity=severity,
                               generated_at=datetime.now(timezone.utc).isoformat())
    except Exception as e:
        logger.error(f"LLM-Fehler: {e}")
        # Deterministischer Fallback
        conf = latest["confidence"]["value"]
        sev = "high" if latest["mode"] == "anomaly" or conf < 0.4 else "medium" if conf < 0.6 else "low"
        msg = (f"Modus '{latest['mode']}': Fusion-Score {latest['fusion']['score']}, "
               f"Konfidenz {conf} ({latest['confidence']['level']}). "
               f"{len(latest['entities'])} Entität(en) erkannt, SNR {latest['raw']['signal']['snr']} dB. "
               f"(Hinweis: LLM nicht erreichbar, statistische Auswertung.)")
        return InsightResponse(assessment=msg, severity=sev,
                               generated_at=datetime.now(timezone.utc).isoformat())


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
