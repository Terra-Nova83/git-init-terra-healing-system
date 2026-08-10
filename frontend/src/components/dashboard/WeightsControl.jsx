import { useEffect, useRef, useState } from "react";
import { Slider } from "../ui/slider";
import { MODEL_META } from "../../lib/rf";
import { RotateCcw } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const KEYS = ["presence", "motion", "signal", "stability"];
const DEFAULTS = { presence: 0.4, motion: 0.3, signal: 0.2, stability: 0.1 };

export const WeightsControl = ({ frame }) => {
  const [vals, setVals] = useState(DEFAULTS);
  const initRef = useRef(false);
  const timerRef = useRef(null);

  // Einmalig aus dem ersten Frame initialisieren (effektive Server-Gewichte)
  useEffect(() => {
    if (!initRef.current && frame?.models) {
      initRef.current = true;
      setVals({
        presence: frame.models.presence.weight,
        motion: frame.models.motion.weight,
        signal: frame.models.signal.weight,
        stability: frame.models.stability.weight,
      });
    }
  }, [frame]);

  const push = (next) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      fetch(`${BACKEND_URL}/api/config/weights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      }).catch(() => {});
    }, 250);
  };

  const onChange = (key, v) => {
    const next = { ...vals, [key]: v / 100 };
    setVals(next);
    push(next);
  };

  const reset = () => {
    setVals(DEFAULTS);
    push(DEFAULTS);
  };

  const total = KEYS.reduce((s, k) => s + vals[k], 0) || 1;

  return (
    <div data-testid="weights-control" className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
      {KEYS.map((k) => {
        const meta = MODEL_META[k];
        const raw = vals[k];
        const effective = raw / total; // normalisiert (Server macht dasselbe)
        return (
          <div key={k} data-testid={`weight-${k}`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-800">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                {meta.label}
              </span>
              <span className="font-mono text-[11px] tabular-nums text-zinc-500">
                <span data-testid={`weight-${k}-value`} className="text-zinc-900">{raw.toFixed(2)}</span>
                <span className="text-zinc-400"> → {effective.toFixed(2)}</span>
              </span>
            </div>
            <Slider
              data-testid={`weight-${k}-slider`}
              value={[Math.round(raw * 100)]}
              min={0}
              max={100}
              step={5}
              onValueChange={(arr) => onChange(k, arr[0])}
            />
          </div>
        );
      })}
      <div className="sm:col-span-2 flex items-center justify-between pt-1">
        <span className="font-mono text-[11px] text-zinc-400">
          Summe {total.toFixed(2)} · wird serverseitig auf 1.00 normalisiert
        </span>
        <button
          data-testid="weights-reset"
          onClick={reset}
          className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50"
        >
          <RotateCcw className="h-3 w-3" /> Standard (0.40/0.30/0.20/0.10)
        </button>
      </div>
    </div>
  );
};
