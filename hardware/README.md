# RF-Sensing — Lokaler Hardware-Betrieb (HAL)

Diese Anleitung beschreibt, wie du **echten Hardware-Zugriff** auf deinem eigenen
Rechner (z.B. Kali Linux) aktivierst. Die Cloud-Vorschau nutzt die simulierte
Quelle; lokal kannst du die Rohdaten von einer echten Antenne/NIC einspeisen.

Referenz-Inspiration: https://github.com/euaziel/WiFi-CSI-Human-Pose-Detection

## 1. Python-Umgebung & Virtual Environment
```bash
cd hardware
python3 -m venv venv
source venv/bin/activate
```

## 2. Dependencies
```bash
pip install --upgrade pip
pip install requests numpy
# CSI-Tooling je nach Hardware (Beispiele):
#   Nexmon CSI (Broadcom / Raspberry Pi)
#   ESP32-CSI-Tool (seriell)
#   Linux 802.11n CSI Tool (Intel 5300)
```

## 3. Verzeichnisstruktur
```
hardware/
├── telemetry.py        # HAL-Einstiegspunkt (SimulatedSource / RealHardwareSource)
├── venv/               # virtuelle Umgebung
└── README.md           # diese Datei
```

## 4. Start
```bash
# simuliert (kein Root nötig)
python3 telemetry.py --source sim

# echte Hardware (Monitor-Modus / Root nötig)
sudo venv/bin/python3 telemetry.py --source hardware --interface wlan0
```
Passe in `RealHardwareSource.read()` die CSI-Erfassung an dein Tool an
(fülle `csi_amplitude` und `csi_phase` mit echten Werten).

## 5. Systemd Service (optional)
`/etc/systemd/system/rf-telemetry.service`:
```ini
[Unit]
Description=RF-Sensing Telemetry Capture
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/rf-sensing/hardware
ExecStart=/opt/rf-sensing/hardware/venv/bin/python3 telemetry.py --source hardware --interface wlan0
Restart=always

[Install]
WantedBy=multi-user.target
```
Aktivieren:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now rf-telemetry.service
sudo systemctl status rf-telemetry.service
```

## TLS / HTTPS
In der Cloud wird HTTPS/WSS bereits über das Ingress bereitgestellt
(`wss://.../api/ws/telemetry`). Für den lokalen Server nutze einen Reverse-Proxy
(nginx/caddy) mit TLS-Zertifikat vor dem Backend.
