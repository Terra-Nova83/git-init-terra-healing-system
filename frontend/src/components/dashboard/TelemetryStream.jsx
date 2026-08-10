import { MODE_META } from "../../lib/rf";

export const TelemetryStream = ({ history }) => {
  const rows = [...(history || [])].slice(-14).reverse();

  return (
    <div data-testid="telemetry-stream">
      <div className="grid grid-cols-[52px_60px_1fr_1fr_1fr] gap-2 px-2 pb-1.5 border-b border-zinc-200 text-[10px] uppercase tracking-wider text-zinc-400 font-mono">
        <span>SEQ</span>
        <span>MODE</span>
        <span className="text-right">FUSION</span>
        <span className="text-right">CONF</span>
        <span className="text-right">RSSI</span>
      </div>
      <div className="mt-1 space-y-0.5 max-h-[220px] overflow-y-auto">
        {rows.length === 0 && (
          <p className="text-xs text-zinc-400 font-mono py-4 text-center">warte auf Stream…</p>
        )}
        {rows.map((f) => {
          const color = MODE_META[f.mode]?.color || "#71717a";
          return (
            <div
              key={f.seq}
              data-testid="telemetry-row"
              className="grid grid-cols-[52px_60px_1fr_1fr_1fr] gap-2 px-2 py-1 font-mono text-[11px] tabular-nums rounded hover:bg-zinc-50"
            >
              <span className="text-zinc-400">#{f.seq}</span>
              <span className="font-medium" style={{ color }}>{f.mode}</span>
              <span className="text-right text-zinc-900">{(f.fusion?.score * 100).toFixed(0)}%</span>
              <span className="text-right text-zinc-600">{(f.confidence?.value * 100).toFixed(0)}%</span>
              <span className="text-right text-zinc-600">{f.raw?.signal?.rssi}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
