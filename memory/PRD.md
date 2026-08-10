# PRD — RF·SENSE (WiFi/5G/LTE/UMTS Sensing Dashboard)

## Problem Statement (original, German)
Web-basiertes Projekt für Telekommunikations-/WiFi-Sensing (5G, LTE, 3G/UMTS, WiFi-CSI) zum Scannen/Erfassen von Objekten (Menschen, Tiere, Gebäude).
Pipeline: Rohdaten (Signal, Motion) → Presence Model + Motion Model → Signal Model → ConfidenceEngine → FusionEngine → WebSocket → Browser Dashboard (Bubbles Core).
Config-Modi: normal / active / idle / anomaly. Fusion-Gewichte: presence 0.40, motion 0.30, signal 0.20, stability 0.10.
Weitere Vorgaben: system-diagram, virtuelle Feld-Darstellung der EM-Frequenzen, Persistenz, Custom Models, telemetry.py (HAL), venv/systemd.
Referenz: https://github.com/euaziel/WiFi-CSI-Human-Pose-Detection

## User Choices
- Hardware: Nutzer wünscht echten Hardware-Zugriff → gelöst via HAL (SimulatedSource in Cloud, RealHardwareSource lokal auf Kali).
- ML-Ebene: LLM-gestützte Anomalie-/Insight-Auswertung (Emergent LLM Key, gpt-5.4). vLLM nicht möglich (keine GPU).
- Persistenz: MongoDB (Telemetrie + Sessions).
- Modi: zur Laufzeit im Dashboard umschaltbar.
- Design: helles, technisches Analyse-Theme (Swiss/High-Contrast).

## Architecture
- **Backend (FastAPI)**: `rf_engine.py` (Pipeline: Raw → 4 Models → ConfidenceEngine → FusionEngine), `server.py` (2Hz WebSocket-Broadcast `/api/ws/telemetry`, REST config/mode/band/weights, telemetry latest/history, sessions, `/api/insights/analyze` LLM). MongoDB via MONGO_URL.
- **Frontend (React)**: `useTelemetry` WS-Hook; Dashboard (Bento-Grid), SystemDiagram, Sessions; Komponenten BubblesCore, VirtualScannableField (Radar), ConfidenceGauge, ModelScorePanels, CSICharts, TelemetryStream, LLMInsightPanel, Header.
- **HAL (lokal)**: `/app/hardware/telemetry.py` + README (venv, deps, systemd, TLS).

## Implemented (2026-06)
- ✅ 2Hz WebSocket-Telemetrie-Stream + Live-Statusanzeige
- ✅ 4 Models mit Gewichten + ConfidenceEngine + FusionEngine
- ✅ Bubbles Core + virtuelles Scan-Feld mit EM-Wellen/Radar-Sweep
- ✅ Runtime Modus-Umschaltung (normal/active/idle/anomaly), Band-Wechsel
- ✅ CSI/RSSI/SNR Charts, Telemetry-Stream-Tabelle
- ✅ MongoDB-Persistenz (Frames + Sessions) + Sessions-Ansicht
- ✅ LLM Anomalie/Insight (gpt-5.4, deutschsprachig) mit deterministischem Fallback
- ✅ System-Diagramm-Seite
- ✅ HAL-Paket für echten lokalen Hardware-Zugriff
- Backend Tests: 10/10 pass. Frontend: alle Flows verifiziert.

## Backlog
- P1: Weights im Dashboard live editierbar (Endpoint existiert bereits)
- P1: Persistente Insight-Historie speichern & anzeigen
- P2: Aufzeichnung/Replay einer Session
- P2: Export (CSV/JSON) der Telemetrie
- P2: Threshold-Alarme + Benachrichtigungen bei Anomalie

## Notes
- Telemetrie ist in dieser Cloud simuliert (hardware-abstrahiert). Echte Daten via `/app/hardware/telemetry.py --source hardware` lokal.
- Keine Authentifizierung in dieser Version.
