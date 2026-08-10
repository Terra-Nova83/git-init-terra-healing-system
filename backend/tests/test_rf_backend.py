"""Backend tests for RF-Sensing telemetry server."""
import os
import json
import asyncio
import pytest
import requests
import websockets

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://wifi-presence-scan.preview.emergentagent.com").rstrip("/")
# WS URL: replace https->wss, http->ws
WS_URL = BASE_URL.replace("https://", "wss://").replace("http://", "ws://") + "/api/ws/telemetry"


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- /api/config ---
def test_get_config(api):
    r = api.get(f"{BASE_URL}/api/config")
    assert r.status_code == 200
    d = r.json()
    assert d["mode"] in ("normal", "active", "idle", "anomaly")
    assert "band" in d
    w = d["weights"]
    # weights (allow slight normalization)
    assert abs(w["presence"] - 0.4) < 0.05
    assert abs(w["motion"] - 0.3) < 0.05
    assert abs(w["signal"] - 0.2) < 0.05
    assert abs(w["stability"] - 0.1) < 0.05
    assert set(d["modes"]) == {"normal", "active", "idle", "anomaly"}
    assert "5G" in d["bands"] and "LTE" in d["bands"]
    assert isinstance(d["session_id"], str) and len(d["session_id"]) > 0


# --- mode switch REST ---
def test_set_mode_active(api):
    r = api.post(f"{BASE_URL}/api/config/mode", json={"mode": "active"})
    assert r.status_code == 200
    assert r.json() == {"ok": True, "mode": "active"}
    # verify via /config
    c = api.get(f"{BASE_URL}/api/config").json()
    assert c["mode"] == "active"


def test_set_mode_invalid(api):
    r = api.post(f"{BASE_URL}/api/config/mode", json={"mode": "bogus"})
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is False


def test_set_band_lte(api):
    r = api.post(f"{BASE_URL}/api/config/band", json={"band": "LTE"})
    assert r.status_code == 200
    assert r.json()["ok"] is True
    c = api.get(f"{BASE_URL}/api/config").json()
    assert c["band"] == "LTE"


# --- telemetry latest & history ---
def test_telemetry_latest(api):
    # ensure at least one frame exists
    import time as _t
    _t.sleep(1.5)
    r = api.get(f"{BASE_URL}/api/telemetry/latest")
    assert r.status_code == 200
    d = r.json()
    assert "seq" in d
    assert "raw" in d and "signal" in d["raw"] and "motion" in d["raw"]
    sig = d["raw"]["signal"]
    assert "rssi" in sig and "snr" in sig
    assert isinstance(sig["csi_amplitude"], list) and len(sig["csi_amplitude"]) == 30
    assert "band_label" in sig and "frequency_mhz" in sig
    for k in ("presence", "motion", "signal", "stability"):
        assert k in d["models"] and "score" in d["models"][k] and "weight" in d["models"][k]
    assert "value" in d["confidence"] and "level" in d["confidence"]
    assert "score" in d["fusion"] and "state" in d["fusion"]
    assert isinstance(d["entities"], list)


def test_telemetry_history(api):
    import time as _t
    _t.sleep(2.5)
    r = api.get(f"{BASE_URL}/api/telemetry/history?limit=50")
    assert r.status_code == 200
    docs = r.json()
    assert isinstance(docs, list)
    if docs:
        for d in docs:
            assert "_id" not in d
            assert "_pk" not in d
            assert "seq" in d


def test_sessions(api):
    r = api.get(f"{BASE_URL}/api/sessions")
    assert r.status_code == 200
    docs = r.json()
    assert isinstance(docs, list) and len(docs) >= 1
    assert "session_id" in docs[0] and "frames" in docs[0]
    assert "_id" not in docs[0]


# --- session frames (NEW) ---
def test_session_frames(api):
    import time as _t
    _t.sleep(2.0)
    sessions = api.get(f"{BASE_URL}/api/sessions").json()
    with_frames = [s for s in sessions if s.get("frames", 0) > 0]
    assert with_frames, "expected at least one session with frames"
    sid = with_frames[0]["session_id"]
    r = api.get(f"{BASE_URL}/api/sessions/{sid}/frames?limit=600")
    assert r.status_code == 200
    frames = r.json()
    assert isinstance(frames, list) and len(frames) > 0
    # sorted by seq ascending
    seqs = [f["seq"] for f in frames]
    assert seqs == sorted(seqs)
    # no _id or _pk leakage; full-shape frames
    for f in frames[:5]:
        assert "_id" not in f and "_pk" not in f
        assert "seq" in f and "mode" in f
        assert "raw" in f and "signal" in f["raw"]
        assert "models" in f and "confidence" in f and "fusion" in f
        assert "entities" in f and isinstance(f["entities"], list)


def test_session_frames_limit(api):
    sessions = api.get(f"{BASE_URL}/api/sessions").json()
    with_frames = [s for s in sessions if s.get("frames", 0) > 0]
    if not with_frames:
        pytest.skip("no session with frames")
    sid = with_frames[0]["session_id"]
    r = api.get(f"{BASE_URL}/api/sessions/{sid}/frames?limit=3")
    assert r.status_code == 200
    assert len(r.json()) <= 3


def test_set_weights(api):
    payload = {"presence": 0.4, "motion": 0.3, "signal": 0.2, "stability": 0.1}
    r = api.post(f"{BASE_URL}/api/config/weights", json=payload)
    assert r.status_code == 200
    d = r.json()
    assert d["ok"] is True
    for k, v in payload.items():
        assert abs(d["weights"][k] - v) < 0.05


# --- LLM insights ---
def test_insights_analyze(api):
    r = api.post(f"{BASE_URL}/api/insights/analyze", timeout=60)
    assert r.status_code == 200
    d = r.json()
    assert isinstance(d["assessment"], str) and len(d["assessment"]) > 5
    assert d["severity"] in ("low", "medium", "high", "info")
    assert "generated_at" in d


# --- WebSocket tests ---
@pytest.mark.asyncio
async def test_websocket_telemetry_stream():
    async with websockets.connect(WS_URL, open_timeout=10) as ws:
        first = json.loads(await asyncio.wait_for(ws.recv(), timeout=10))
        assert first["event"] == "connected"
        assert "session_id" in first["data"]

        # Collect a few telemetry frames
        got_telemetry = 0
        seqs = []
        for _ in range(6):
            msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
            if msg.get("event") == "telemetry":
                got_telemetry += 1
                seqs.append(msg["data"]["seq"])
        assert got_telemetry >= 2
        # seq should be monotonic
        assert seqs == sorted(seqs)


@pytest.mark.asyncio
async def test_websocket_set_mode():
    async with websockets.connect(WS_URL, open_timeout=10) as ws:
        await asyncio.wait_for(ws.recv(), timeout=10)  # connected
        await ws.send(json.dumps({"action": "set_mode", "mode": "idle"}))
        # wait for a few frames and check mode has flipped to idle
        found_idle = False
        for _ in range(10):
            msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
            if msg.get("event") == "telemetry" and msg["data"].get("mode") == "idle":
                found_idle = True
                break
        assert found_idle
