#!/usr/bin/env python3
"""
telemetry.py — Hardware-abstrahierte Datenerfassung (HAL).

Dieses Skript ist der EINSTIEGSPUNKT für ECHTEN Hardware-Zugriff auf deinem
lokalen Rechner (z.B. Kali Linux mit WiFi-CSI-Tool, siehe
https://github.com/euaziel/WiFi-CSI-Human-Pose-Detection).

Zwei Quellen (austauschbar):
  - SimulatedSource     : erzeugt realistische Rohdaten (Standard, für Cloud/Test)
  - RealHardwareSource  : liest echte CSI/RSSI-Daten von deiner Antenne/NIC

Aufruf:
    python3 telemetry.py --source sim      # simuliert
    python3 telemetry.py --source hardware # echte Hardware (lokal, root nötig)

Die erfassten Rohdaten werden an denselben Server-Endpunkt gestreamt, den
auch das Dashboard nutzt. So bleibt die Pipeline (Presence/Motion/Signal ->
Confidence -> Fusion -> WebSocket -> Dashboard) unverändert.
"""
import argparse
import json
import time
import subprocess
import sys


class SimulatedSource:
    """Erzeugt Rohdaten ohne Hardware (für Cloud / Entwicklung)."""

    def read(self):
        import random
        return {
            "rssi": round(-55 + random.uniform(-10, 10), 1),
            "snr": round(20 + random.uniform(-5, 5), 1),
            "csi_amplitude": [round(20 + random.gauss(0, 3), 2) for _ in range(30)],
            "csi_phase": [round(random.uniform(-3.14, 3.14), 3) for _ in range(30)],
            "ts": time.time(),
        }


class RealHardwareSource:
    """
    ECHTE Hardware-Quelle. Passe die Erfassung an dein Setup an.

    Beispiele:
      - Nexmon CSI (Broadcom): liest UDP-Pakete mit CSI-Frames
      - ESP32-CSI-Tool: serielle Schnittstelle /dev/ttyUSB0
      - Intel 5300 (Linux 802.11n CSI Tool): /dev/csi

    Unten ein Beispiel über `iw`/`tcpdump` für RSSI. Für vollständiges CSI
    integriere das Tool aus dem Referenz-Repo und fülle csi_amplitude/csi_phase.
    """

    def __init__(self, interface="wlan0"):
        self.interface = interface

    def read(self):
        rssi = self._read_rssi()
        # TODO: echtes CSI vom Capture-Tool einlesen (nexmon/esp32/iwl5300)
        return {
            "rssi": rssi,
            "snr": None,
            "csi_amplitude": [],   # <- hier echte CSI-Amplituden einfügen
            "csi_phase": [],       # <- hier echte CSI-Phasen einfügen
            "ts": time.time(),
        }

    def _read_rssi(self):
        try:
            out = subprocess.check_output(
                ["iw", "dev", self.interface, "link"], stderr=subprocess.DEVNULL
            ).decode()
            for line in out.splitlines():
                if "signal:" in line:
                    return float(line.split("signal:")[1].split("dBm")[0].strip())
        except Exception:
            pass
        return None


def main():
    parser = argparse.ArgumentParser(description="RF-Sensing Telemetrie (HAL)")
    parser.add_argument("--source", choices=["sim", "hardware"], default="sim")
    parser.add_argument("--interface", default="wlan0")
    parser.add_argument("--rate", type=float, default=2.0, help="Samples pro Sekunde")
    args = parser.parse_args()

    if args.source == "hardware":
        src = RealHardwareSource(interface=args.interface)
        print(f"[HAL] Echte Hardware-Quelle aktiv (interface={args.interface}). Root/Monitor-Modus nötig.",
              file=sys.stderr)
    else:
        src = SimulatedSource()
        print("[HAL] Simulierte Quelle aktiv.", file=sys.stderr)

    interval = 1.0 / args.rate
    while True:
        sample = src.read()
        print(json.dumps(sample))
        sys.stdout.flush()
        time.sleep(interval)


if __name__ == "__main__":
    main()
