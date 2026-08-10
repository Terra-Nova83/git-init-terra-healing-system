import { ConfigModeSwitcher } from "../components/dashboard/ConfigModeSwitcher";
import { VirtualScannableField } from "../components/dashboard/VirtualScannableField";
import { BubblesCore } from "../components/dashboard/BubblesCore";
import { ConfidenceGauge } from "../components/dashboard/ConfidenceGauge";
import { ModelScorePanels } from "../components/dashboard/ModelScorePanels";
import { CSICharts } from "../components/dashboard/CSICharts";
import { TelemetryStream } from "../components/dashboard/TelemetryStream";
import { LLMInsightPanel } from "../components/dashboard/LLMInsightPanel";
import { MODE_META } from "../lib/rf";
import { Waves, Target, Radar, Boxes } from "lucide-react";

const FUSION_STATE = {
  clear: "Feld frei",
  presence_moving: "Anwesenheit + Bewegung",
  presence_static: "Anwesenheit (statisch)",
  uncertain: "Unklar",
  presence_detected: "Anwesenheit erkannt",
};

const Panel = ({ title, icon: Icon, children, className = "", testid, right }) => (
  <section data-testid={testid} className={`bg-white border border-zinc-200 p-5 ${className}`}>
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-zinc-900" strokeWidth={1.5} />}
        <h3 className="text-sm font-bold tracking-tight text-zinc-900">{title}</h3>
      </div>
      {right}
    </div>
    {children}
  </section>
);

export default function Dashboard({ frame, history, sendAction }) {
  const mode = frame?.mode || "normal";
  const fusion = frame?.fusion || {};
  const confidence = frame?.confidence || {};
  const signal = frame?.raw?.signal || {};
  const modeColor = MODE_META[mode]?.color;

  return (
    <div className="col-span-full grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 sm:p-6">
      {/* Modus-Steuerung */}
      <Panel testid="config-panel" title="Konfiguration · Modus" icon={Radar}
        className="lg:col-span-12"
        right={<span className="font-mono text-[11px] text-zinc-500">Live umschaltbar</span>}>
        <ConfigModeSwitcher mode={mode} sendAction={sendAction} />
      </Panel>

      {/* Virtuelles Scan-Feld */}
      <Panel testid="field-panel" title="Virtuelles Scan-Feld · EM-Frequenzen" icon={Target}
        className="lg:col-span-7 lg:row-span-2"
        right={<span className="font-mono text-[11px] tabular-nums text-zinc-500">{signal.band_label} · {signal.frequency_mhz} MHz</span>}>
        <VirtualScannableField frame={frame} />
        <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[11px]">
          <div className="rounded bg-zinc-50 border border-zinc-100 p-2">
            <div className="text-zinc-400 text-[10px]">RSSI</div>
            <div className="tabular-nums text-zinc-900" data-testid="stat-rssi">{signal.rssi ?? "—"} dBm</div>
          </div>
          <div className="rounded bg-zinc-50 border border-zinc-100 p-2">
            <div className="text-zinc-400 text-[10px]">SNR</div>
            <div className="tabular-nums text-zinc-900" data-testid="stat-snr">{signal.snr ?? "—"} dB</div>
          </div>
          <div className="rounded bg-zinc-50 border border-zinc-100 p-2">
            <div className="text-zinc-400 text-[10px]">OBJEKTE</div>
            <div className="tabular-nums text-zinc-900" data-testid="stat-entities">{frame?.entities?.length ?? 0}</div>
          </div>
        </div>
      </Panel>

      {/* Fusion + Confidence */}
      <Panel testid="fusion-panel" title="FusionEngine · ConfidenceEngine" icon={Waves}
        className="lg:col-span-5">
        <div className="grid grid-cols-2 gap-4 items-center">
          <div>
            <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Fusion Score</div>
            <div data-testid="fusion-score-value" className="font-mono text-5xl font-bold tabular-nums text-zinc-900 leading-none mt-1">
              {((fusion.score || 0) * 100).toFixed(0)}<span className="text-lg text-zinc-400">%</span>
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={{ backgroundColor: `${modeColor}18`, color: modeColor }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: modeColor }} />
              <span data-testid="fusion-state">{FUSION_STATE[fusion.state] || fusion.state || "—"}</span>
            </div>
          </div>
          <ConfidenceGauge value={confidence.value || 0} level={confidence.level} />
        </div>
      </Panel>

      {/* Bubbles Core */}
      <Panel testid="bubbles-panel" title="Bubbles Core" icon={Boxes}
        className="lg:col-span-5">
        <BubblesCore frame={frame} />
      </Panel>

      {/* Model Scores */}
      <div className="lg:col-span-7">
        <div className="mb-2 flex items-center gap-2 px-1">
          <span className="text-xs font-bold tracking-tight text-zinc-900">Models · gewichtete Scores</span>
        </div>
        <ModelScorePanels models={frame?.models} />
      </div>

      {/* LLM Insight */}
      <div className="lg:col-span-5">
        <LLMInsightPanel />
      </div>

      {/* Telemetry Stream */}
      <Panel testid="stream-panel" title="Telemetry Stream · 2 Hz" icon={Radar}
        className="lg:col-span-5">
        <TelemetryStream history={history} />
      </Panel>

      {/* CSI / Signal Charts */}
      <Panel testid="charts-panel" title="Signal · CSI Analyse" icon={Waves}
        className="lg:col-span-7">
        <CSICharts frame={frame} history={history} />
      </Panel>
    </div>
  );
}
