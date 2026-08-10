import { motion } from "framer-motion";
import { Signal, User, Move, Radio, Gauge, Layers, Wifi, MonitorSmartphone } from "lucide-react";

const Node = ({ icon: Icon, title, sub, accent, delay, testid }) => (
  <motion.div
    data-testid={testid}
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="w-full max-w-[280px] rounded-md border border-zinc-200 bg-white px-4 py-3 flex items-center gap-3"
    style={{ borderLeft: `3px solid ${accent}` }}
  >
    <div className="h-9 w-9 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: `${accent}18` }}>
      <Icon className="h-4 w-4" strokeWidth={1.5} style={{ color: accent }} />
    </div>
    <div className="leading-tight">
      <div className="text-sm font-semibold text-zinc-900">{title}</div>
      <div className="text-[11px] text-zinc-500 font-mono">{sub}</div>
    </div>
  </motion.div>
);

const Arrow = ({ delay }) => (
  <motion.div
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: 22 }}
    transition={{ delay, duration: 0.3 }}
    className="w-px bg-zinc-300 my-1 relative"
  >
    <span className="absolute -bottom-1 -left-[3px] h-0 w-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent border-t-zinc-400" />
  </motion.div>
);

export default function SystemDiagram() {
  return (
    <div className="col-span-full tech-grid-bg min-h-[calc(100vh-4rem)] p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">System-Architektur</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Datenfluss der RF-Sensing Pipeline — von Rohdaten bis zum Browser-Dashboard.
          </p>
        </div>

        <div className="flex flex-col items-center">
          <Node testid="diag-raw" icon={Wifi} title="Rohdaten (Signal · Motion)" sub="HAL · 5G/LTE/UMTS/WiFi-CSI" accent="#18181b" delay={0.05} />
          <Arrow delay={0.15} />

          <div className="flex gap-4 w-full justify-center">
            <Node testid="diag-presence" icon={User} title="Presence Model" sub="Anwesenheit · CSI-Varianz" accent="#8b5cf6" delay={0.2} />
            <Node testid="diag-motion" icon={Move} title="Motion Model" sub="Doppler · Velocity" accent="#f59e0b" delay={0.25} />
          </div>
          <Arrow delay={0.35} />

          <Node testid="diag-signal" icon={Signal} title="Signal Model" sub="RSSI · SNR · Qualität" accent="#10b981" delay={0.4} />
          <Arrow delay={0.5} />
          <Node testid="diag-confidence" icon={Gauge} title="ConfidenceEngine" sub="Kohärenz · Verlässlichkeit" accent="#0ea5e9" delay={0.55} />
          <Arrow delay={0.65} />
          <Node testid="diag-fusion" icon={Layers} title="FusionEngine" sub="w: 0.40 / 0.30 / 0.20 / 0.10" accent="#2563eb" delay={0.7} />
          <Arrow delay={0.8} />
          <Node testid="diag-ws" icon={Radio} title="WebSocket" sub="Broadcast · 2× pro Sekunde" accent="#64748b" delay={0.85} />
          <Arrow delay={0.95} />
          <Node testid="diag-dashboard" icon={MonitorSmartphone} title="Browser Dashboard" sub="Bubbles Core" accent="#18181b" delay={1.0} />
        </div>

        <div className="mt-8 rounded-md border border-zinc-200 bg-white p-5">
          <h3 className="text-sm font-bold tracking-tight text-zinc-900 mb-2">Fusion-Gewichte</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-sm">
            <div className="rounded bg-zinc-50 p-3"><span className="text-violet-500">Presence</span><div className="text-zinc-900 tabular-nums">0.40</div></div>
            <div className="rounded bg-zinc-50 p-3"><span className="text-amber-500">Motion</span><div className="text-zinc-900 tabular-nums">0.30</div></div>
            <div className="rounded bg-zinc-50 p-3"><span className="text-emerald-500">Signal</span><div className="text-zinc-900 tabular-nums">0.20</div></div>
            <div className="rounded bg-zinc-50 p-3"><span className="text-sky-500">Stability</span><div className="text-zinc-900 tabular-nums">0.10</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
