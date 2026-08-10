"""
RF-Sensing Engine.
Hardware-abstracted telemetry pipeline:
  Raw Data (Signal, Motion) -> Presence / Motion / Signal / Stability Models
  -> ConfidenceEngine -> FusionEngine -> (WebSocket) -> Dashboard

Alle Models arbeiten deterministisch/statistisch. Die Rohdatenquelle ist
hardware-abstrahiert (SimulatedSource in der Cloud, RealHardwareSource lokal).
"""
import math
import random
import time
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Konfiguration
# ---------------------------------------------------------------------------
MODES = ("normal", "active", "idle", "anomaly")

# Frequenzbänder (Telekommunikation): UMTS/3G, LTE/4G, 5G
BANDS = {
    "UMTS": {"freq_mhz": 2100, "label": "UMTS / 3G"},
    "LTE": {"freq_mhz": 1800, "label": "LTE / 4G"},
    "5G": {"freq_mhz": 3500, "label": "5G NR"},
    "WIFI": {"freq_mhz": 5200, "label": "WiFi 5GHz (CSI)"},
}

# Fusion-Gewichte (vom Nutzer vorgegeben)
DEFAULT_WEIGHTS = {
    "presence": 0.40,
    "motion": 0.30,
    "signal": 0.20,
    "stability": 0.10,
}

# Modus-Profile steuern Charakter der Rohdaten
MODE_PROFILES = {
    "normal": {"presence": 0.62, "motion": 0.45, "noise": 0.06, "entities": (1, 3), "snr": 20},
    "active": {"presence": 0.85, "motion": 0.82, "noise": 0.08, "entities": (2, 5), "snr": 24},
    "idle": {"presence": 0.30, "motion": 0.10, "noise": 0.04, "entities": (0, 1), "snr": 26},
    "anomaly": {"presence": 0.55, "motion": 0.60, "noise": 0.28, "entities": (1, 6), "snr": 9},
}

N_SUBCARRIERS = 30


def _clamp(v, lo=0.0, hi=1.0):
    return max(lo, min(hi, v))


class EngineState:
    """Hält geglättete laufende Werte für flüssige Übergänge zwischen den 2Hz-Frames."""

    def __init__(self):
        self.mode = "normal"
        self.band = "5G"
        self.weights = dict(DEFAULT_WEIGHTS)
        self.seq = 0
        # geglättete Kennwerte
        self.presence = 0.5
        self.motion = 0.3
        self.snr = 20.0
        self.rssi = -55.0
        self.stability = 0.9
        self.entities = []  # persistente Entitäten mit Trägheit
        self._last_ts = time.time()

    def set_mode(self, mode):
        if mode in MODES:
            self.mode = mode

    def set_band(self, band):
        if band in BANDS:
            self.band = band

    def set_weights(self, w):
        merged = dict(self.weights)
        for k in ("presence", "motion", "signal", "stability"):
            if k in w and isinstance(w[k], (int, float)):
                merged[k] = float(w[k])
        # normalisieren, damit Summe ~ 1
        total = sum(merged.values()) or 1.0
        self.weights = {k: round(v / total, 3) for k, v in merged.items()}


# ---------------------------------------------------------------------------
# Rohdaten-Quelle (Hardware Abstraction Layer)
# ---------------------------------------------------------------------------
def _smooth(current, target, alpha):
    return current + (target - current) * alpha


def _gen_entities(state, profile):
    lo, hi = profile["entities"]
    target_n = random.randint(lo, hi)
    ents = state.entities

    # bestehende Entitäten leicht bewegen
    speed = 0.03 + profile["motion"] * 0.06
    for e in ents:
        e["x"] = _clamp(e["x"] + random.uniform(-speed, speed), -1, 1)
        e["y"] = _clamp(e["y"] + random.uniform(-speed, speed), -1, 1)
        e["confidence"] = _clamp(e["confidence"] + random.uniform(-0.05, 0.05), 0.2, 1)
        e["distance"] = round(math.hypot(e["x"], e["y"]) * 12, 2)

    # anpassen der Anzahl
    while len(ents) < target_n:
        etype = random.choice(["human", "human", "animal", "structure"])
        ents.append({
            "id": f"E-{random.randint(1000, 9999)}",
            "type": etype,
            "x": round(random.uniform(-0.9, 0.9), 3),
            "y": round(random.uniform(-0.9, 0.9), 3),
            "confidence": round(random.uniform(0.4, 0.95), 3),
            "distance": 0.0,
        })
    while len(ents) > target_n:
        ents.pop(random.randrange(len(ents)))

    for e in ents:
        e["x"] = round(e["x"], 3)
        e["y"] = round(e["y"], 3)
        e["confidence"] = round(e["confidence"], 3)
    state.entities = ents
    return ents


def generate_raw(state: EngineState):
    """Erzeugt Rohdaten (Signal, Motion) – hardware-abstrahiert."""
    profile = MODE_PROFILES[state.mode]
    noise = profile["noise"]
    alpha = 0.25

    state.presence = _clamp(_smooth(state.presence, profile["presence"] + random.uniform(-noise, noise), alpha))
    state.motion = _clamp(_smooth(state.motion, profile["motion"] + random.uniform(-noise, noise), alpha))
    state.snr = _smooth(state.snr, profile["snr"] + random.uniform(-3, 3), alpha)

    band = BANDS[state.band]
    # RSSI korreliert grob mit SNR
    target_rssi = -40 - (30 - state.snr) * 1.2 + random.uniform(-4, 4)
    state.rssi = _smooth(state.rssi, target_rssi, alpha)

    # CSI (Channel State Information) – Amplitude & Phase je Subträger
    base_amp = 20 + state.snr
    csi_amplitude = []
    csi_phase = []
    for i in range(N_SUBCARRIERS):
        wave = math.sin(i / 3.0 + state.seq / 4.0) * (2 + state.motion * 6)
        amp = base_amp + wave + random.gauss(0, 1 + noise * 10)
        csi_amplitude.append(round(amp, 2))
        phase = math.sin(i / 5.0 + state.seq / 6.0) * math.pi + random.gauss(0, 0.15 + noise)
        csi_phase.append(round(phase, 3))

    # Doppler / Bewegung
    doppler = round(state.motion * 3.5 + random.uniform(-noise, noise), 3)
    velocity = round(state.motion * 1.8 + random.uniform(0, 0.2), 3)

    entities = _gen_entities(state, profile)

    return {
        "signal": {
            "band": state.band,
            "band_label": band["label"],
            "frequency_mhz": band["freq_mhz"],
            "rssi": round(state.rssi, 1),
            "snr": round(state.snr, 1),
            "csi_amplitude": csi_amplitude,
            "csi_phase": csi_phase,
            "csi_amp_mean": round(sum(csi_amplitude) / len(csi_amplitude), 2),
        },
        "motion": {
            "doppler": doppler,
            "velocity": velocity,
            "activity": round(state.motion, 3),
        },
        "presence_raw": round(state.presence, 3),
        "entities": entities,
    }


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
def presence_model(raw):
    """Anwesenheits-Model: kombiniert Rohanwesenheit + CSI-Varianz + Entitätenzahl."""
    amp = raw["signal"]["csi_amplitude"]
    mean = sum(amp) / len(amp)
    variance = sum((a - mean) ** 2 for a in amp) / len(amp)
    var_score = _clamp(variance / 40.0)
    ent_score = _clamp(len(raw["entities"]) / 4.0)
    score = _clamp(0.5 * raw["presence_raw"] + 0.3 * var_score + 0.2 * ent_score)
    return round(score, 3)


def motion_model(raw):
    """Bewegungs-Model: Doppler + Velocity + Aktivität."""
    m = raw["motion"]
    score = _clamp(0.5 * (m["doppler"] / 3.5) + 0.3 * (m["velocity"] / 1.8) + 0.2 * m["activity"])
    return round(score, 3)


def signal_model(raw):
    """Signalqualitäts-Model: SNR + RSSI normalisiert."""
    snr = raw["signal"]["snr"]
    rssi = raw["signal"]["rssi"]
    snr_score = _clamp(snr / 30.0)
    rssi_score = _clamp((rssi + 90) / 50.0)  # -90..-40 -> 0..1
    score = _clamp(0.6 * snr_score + 0.4 * rssi_score)
    return round(score, 3)


def stability_model(raw, history):
    """Stabilitäts-Model: geringe Streuung der jüngsten Signal-Scores = hohe Stabilität."""
    if len(history) < 3:
        return round(_clamp(raw["signal"]["snr"] / 30.0), 3)
    recent = history[-8:]
    mean = sum(recent) / len(recent)
    var = sum((x - mean) ** 2 for x in recent) / len(recent)
    score = _clamp(1.0 - var * 6.0)
    return round(score, 3)


# ---------------------------------------------------------------------------
# ConfidenceEngine & FusionEngine
# ---------------------------------------------------------------------------
def confidence_engine(scores):
    """Bewertet, wie verlässlich die Model-Ausgaben zusammenpassen (Kohärenz)."""
    vals = list(scores.values())
    mean = sum(vals) / len(vals)
    spread = sum(abs(v - mean) for v in vals) / len(vals)
    coherence = _clamp(1.0 - spread * 1.5)
    strength = mean
    confidence = _clamp(0.6 * strength + 0.4 * coherence)
    if confidence >= 0.75:
        level = "high"
    elif confidence >= 0.45:
        level = "medium"
    else:
        level = "low"
    return {"value": round(confidence, 3), "coherence": round(coherence, 3), "level": level}


def fusion_engine(scores, weights, confidence):
    """Gewichtete Fusion aller Models zu einem Gesamtscore + Zustand."""
    fused = sum(scores[k] * weights[k] for k in weights)
    fused = _clamp(fused)
    presence_hit = scores["presence"] > 0.55
    motion_hit = scores["motion"] > 0.5
    if not presence_hit and scores["presence"] < 0.35:
        state = "clear"
    elif presence_hit and motion_hit:
        state = "presence_moving"
    elif presence_hit:
        state = "presence_static"
    else:
        state = "uncertain"
    return {
        "score": round(fused, 3),
        "state": state,
        "confidence": confidence["value"],
    }


class Pipeline:
    """Kompletter Durchlauf: Raw -> Models -> Confidence -> Fusion."""

    def __init__(self):
        self.state = EngineState()
        self._signal_history = []

    def step(self):
        st = self.state
        st.seq += 1
        raw = generate_raw(st)

        p = presence_model(raw)
        m = motion_model(raw)
        s = signal_model(raw)
        self._signal_history.append(s)
        if len(self._signal_history) > 40:
            self._signal_history.pop(0)
        stab = stability_model(raw, self._signal_history)

        scores = {"presence": p, "motion": m, "signal": s, "stability": stab}
        conf = confidence_engine(scores)
        fusion = fusion_engine(scores, st.weights, conf)

        return {
            "seq": st.seq,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "mode": st.mode,
            "band": st.band,
            "raw": {
                "signal": raw["signal"],
                "motion": raw["motion"],
            },
            "models": {
                "presence": {"score": p, "weight": st.weights["presence"]},
                "motion": {"score": m, "weight": st.weights["motion"]},
                "signal": {"score": s, "weight": st.weights["signal"]},
                "stability": {"score": stab, "weight": st.weights["stability"]},
            },
            "confidence": conf,
            "fusion": fusion,
            "entities": raw["entities"],
        }
