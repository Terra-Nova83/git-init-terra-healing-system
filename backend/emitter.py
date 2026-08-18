"""
Skalar-Emitter: Planung eines Feld-Basisbands + Export als SDR-Konfiguration.

WICHTIG / EHRLICH:
- Browser/PC können KEIN freies HF-Trägersignal abstrahlen. Dieses Modul plant
  das Skalar-Basisband und exportiert es als SDR-Konfiguration. Ein angeschlossener
  Transceiver (HackRF, LimeSDR, PlutoSDR, USRP) oder eine Feldspule strahlt real ab.
- Es gibt KEINEN wissenschaftlichen Wirknachweis für "Heilfrequenzen"/Skalarfelder.
  Dieses Tool dient der Signal-Planung, Visualisierung und dem Export - nicht als
  Medizinprodukt und ohne Heilversprechen.
- Nur lizenzfreie ISM/SRD-Bänder sind für eigene Aussendung vorgesehen
  (Deutschland: BNetzA Allgemeinzuteilung Vfg. 91/2025).
"""
from datetime import datetime, timezone

SCHUMANN = 7.83  # Hz – Schumann-Resonanz (Delta/Skalar-Standard)

# Deutschlandweit lizenzfreie Bänder (BNetzA Vfg. 91/2025, gültig bis 31.12.2035)
GERMAN_ISM_BANDS = [
    {"id": "ism_6m78", "label": "6,78 MHz (ISM)", "range_mhz": [6.765, 6.795], "center_mhz": 6.78,
     "max_power": "42 dBµA/m @10m (induktiv)", "use": "Induktiv / SRD", "legal": "Vfg. 91/2025"},
    {"id": "ism_13m56", "label": "13,56 MHz (ISM · RFID)", "range_mhz": [13.553, 13.567], "center_mhz": 13.56,
     "max_power": "60 dBµA/m @10m", "use": "Induktiv / RFID / NFC", "legal": "Vfg. 91/2025 (Band 27a)"},
    {"id": "ism_27m12", "label": "27,12 MHz (ISM)", "range_mhz": [26.957, 27.283], "center_mhz": 27.12,
     "max_power": "10 mW ERP (SRD)", "use": "SRD / Modellbau / CB-nah", "legal": "Vfg. 91/2025"},
    {"id": "ism_40m68", "label": "40,68 MHz (ISM)", "range_mhz": [40.66, 40.70], "center_mhz": 40.68,
     "max_power": "10 mW ERP", "use": "SRD / Telemetrie", "legal": "Vfg. 91/2025"},
    {"id": "srd_433", "label": "433,92 MHz (SRD 433)", "range_mhz": [433.05, 434.79], "center_mhz": 433.92,
     "max_power": "10 mW ERP (Duty-Cycle beachten)", "use": "SRD allgemein (empfohlen)", "legal": "Vfg. 91/2025 (Band 44a)"},
    {"id": "srd_868", "label": "868,3 MHz (SRD 868)", "range_mhz": [863.0, 870.0], "center_mhz": 868.3,
     "max_power": "25 mW ERP (Breitband) / 1% Duty", "use": "SRD / LoRa / IoT", "legal": "Vfg. 91/2025"},
    {"id": "ism_2g4", "label": "2,4 GHz (ISM)", "range_mhz": [2400.0, 2483.5], "center_mhz": 2441.75,
     "max_power": "100 mW EIRP", "use": "WLAN / Bluetooth / SRD", "legal": "Vfg. 91/2025 / Vfg. 136/2022"},
    {"id": "ism_5g8", "label": "5,8 GHz (ISM)", "range_mhz": [5725.0, 5875.0], "center_mhz": 5800.0,
     "max_power": "25 mW EIRP (SRD)", "use": "SRD / WLAN-nah", "legal": "Vfg. 91/2025"},
]

WAVEFORMS = ["sine", "square", "triangle", "sawtooth"]
MODES = ["Longitudinal", "Transversal", "Bio-Photon"]

# Standard-Kanäle (Beispiele). Neutrale Signal-Programme, keine medizinische Zweckbestimmung.
DEFAULT_EMITTER = {
    "master_level": 0.35,
    "amplitude_factor": 1.0,
    "emf_load": 0.12,
    "bias": 0.0,
    "carrier_band_id": "srd_433",
    "schumann": SCHUMANN,
    "channels": [
        {"id": "ch_micro", "name": "Mikroorganismen", "icon": "bug", "active": True, "mode": "Longitudinal",
         "waveform": "sine", "frequency": 285.0, "delta": SCHUMANN, "amplitude": 0.74, "modulation": 0.24},
        {"id": "ch_insect", "name": "Insekten", "icon": "bug", "active": True, "mode": "Longitudinal",
         "waveform": "sine", "frequency": 417.0, "delta": SCHUMANN, "amplitude": 0.69, "modulation": 0.38},
        {"id": "ch_plant", "name": "Pflanzen", "icon": "leaf", "active": False, "mode": "Bio-Photon",
         "waveform": "sine", "frequency": 528.0, "delta": SCHUMANN, "amplitude": 0.60, "modulation": 0.30},
        {"id": "ch_soil", "name": "Boden / Mineralien", "icon": "mountain", "active": False, "mode": "Transversal",
         "waveform": "triangle", "frequency": 174.0, "delta": SCHUMANN, "amplitude": 0.55, "modulation": 0.20},
    ],
    "disclaimer": (
        "Funkbetrieb statt Kopfhörer: Browser/PC senden nicht. Der Feldträger wird geplant "
        "und als SDR-Konfiguration exportiert (HackRF/LimeSDR/PlutoSDR/USRP oder Feldspule). "
        "Kein Medizinprodukt, kein Wirknachweis für Skalar-/Heilfrequenzen – nur Signalplanung."
    ),
}


def _derived(ch, emf_load):
    amp = ch.get("amplitude", 0.5)
    mod = ch.get("modulation", 0.2)
    am_hz = round(0.3 + mod * 0.6, 2)
    detune_ct = round(ch.get("delta", SCHUMANN) / 40.0, 2)
    vitality = max(0.0, min(1.0, amp * 0.6 + (1 - mod) * 0.25 + (1 - emf_load) * 0.15))
    return {"am_hz": am_hz, "detune_ct": detune_ct, "vitality": round(vitality, 3)}


def build_sdr_config(payload):
    band = next((b for b in GERMAN_ISM_BANDS if b["id"] == payload.get("carrier_band_id")), GERMAN_ISM_BANDS[4])
    emf = payload.get("emf_load", 0.12)
    master = payload.get("master_level", 0.35)
    amp_factor = payload.get("amplitude_factor", 1.0)

    channels = []
    for ch in payload.get("channels", []):
        if not ch.get("active", True):
            continue
        d = _derived(ch, emf)
        eff_amp = round(min(1.0, ch.get("amplitude", 0.5) * amp_factor * (1 - emf * 0.5)), 4)
        channels.append({
            "name": ch.get("name"),
            "mode": ch.get("mode", "Longitudinal"),
            "waveform": ch.get("waveform", "sine"),
            "frequency_hz": ch.get("frequency"),
            "delta_hz": ch.get("delta", SCHUMANN),
            "amplitude": eff_amp,
            "modulation_depth": ch.get("modulation", 0.2),
            "am_hz": d["am_hz"],
            "detune_ct": d["detune_ct"],
        })

    return {
        "meta": {
            "generator": "RF-SENSE · Skalar-Emitter",
            "created": datetime.now(timezone.utc).isoformat(),
            "note": ("Kein Sendebetrieb im Browser. Diese Datei ist eine SDR-Basisband-Planung. "
                     "Nur lizenzfreie ISM/SRD-Bänder für eigene Aussendung nutzen."),
            "no_medical_claim": True,
        },
        "carrier": {
            "band_id": band["id"],
            "label": band["label"],
            "center_hz": int(band["center_mhz"] * 1_000_000),
            "range_hz": [int(band["range_mhz"][0] * 1_000_000), int(band["range_mhz"][1] * 1_000_000)],
            "max_power": band["max_power"],
            "legal": band["legal"],
            "region": "DE",
        },
        "baseband": {
            "sample_rate_hz": 250000,
            "duration_s": 10,
            "master_level": master,
            "emf_load": emf,
            "schumann_delta_hz": SCHUMANN,
            "channels": channels,
        },
        "device_hints": {
            "HackRF": "hackrf_transfer -t baseband.iq -f {center} -s 2000000 -x 20",
            "LimeSDR": "LimeSuite: TX @ {center}, SampleRate 2 MHz, IQ aus baseband",
            "PlutoSDR": "iio_attr / GNU Radio: TX LO {center}, samp_rate 2 MHz",
            "USRP": "uhd tx_samples_from_file --freq {center} --rate 2e6",
        },
    }
