import { MODEL_META, pct } from "../../lib/rf";

export const ModelScorePanels = ({ models }) => {
  const keys = ["presence", "motion", "signal", "stability"];
  return (
    <div data-testid="model-panels" className="grid grid-cols-2 gap-3">
      {keys.map((k) => {
        const meta = MODEL_META[k];
        const m = models?.[k] || { score: 0, weight: 0 };
        return (
          <div
            key={k}
            data-testid={`model-${k}`}
            className="rounded-md border border-zinc-200 bg-white p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                <span className="text-xs font-semibold text-zinc-800">{meta.label}</span>
              </div>
              <span className="font-mono text-[10px] text-zinc-400 tabular-nums">w {m.weight.toFixed(2)}</span>
            </div>
            <div className="mt-2 flex items-end justify-between">
              <span data-testid={`model-${k}-score`} className="font-mono text-2xl font-semibold tabular-nums text-zinc-900">
                {pct(m.score)}
              </span>
              <span className="text-[10px] text-zinc-400">{meta.hint}</span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-300 ease-out"
                style={{ width: `${(m.score * 100).toFixed(0)}%`, backgroundColor: meta.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
