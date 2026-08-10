import { useState } from "react";
import { Sparkles, AlertTriangle, Loader2 } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const SEV = {
  low: { color: "#10b981", label: "LOW", border: "border-l-emerald-500" },
  medium: { color: "#f59e0b", label: "MEDIUM", border: "border-l-amber-500" },
  high: { color: "#ef4444", label: "HIGH", border: "border-l-red-500" },
  info: { color: "#71717a", label: "INFO", border: "border-l-zinc-400" },
};

export const LLMInsightPanel = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const analyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/insights/analyze`, { method: "POST" });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError("Analyse fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  };

  const sev = result ? SEV[result.severity] || SEV.info : SEV.info;

  return (
    <div
      data-testid="llm-insight-panel"
      className={`h-full border border-zinc-200 border-l-4 ${result ? sev.border : "border-l-zinc-900"} bg-white p-5 flex flex-col`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-zinc-900" strokeWidth={1.5} />
          <h3 className="text-sm font-bold tracking-tight text-zinc-900">KI-Anomalie & Insight</h3>
        </div>
        {result && (
          <span
            data-testid="insight-severity"
            className="rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold"
            style={{ backgroundColor: `${sev.color}18`, color: sev.color }}
          >
            {sev.label}
          </span>
        )}
      </div>

      <div className="mt-3 flex-1">
        {result ? (
          <p data-testid="insight-text" className="text-sm leading-relaxed text-zinc-700">
            {result.assessment}
          </p>
        ) : (
          <p className="text-xs text-zinc-400 leading-relaxed">
            Lass die KI die aktuellen Telemetriedaten (Fusion, Konfidenz, Signal) auf
            Anomalien und Muster prüfen.
          </p>
        )}
        {error && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-red-500">
            <AlertTriangle className="h-3.5 w-3.5" /> {error}
          </p>
        )}
      </div>

      <button
        data-testid="analyze-btn"
        onClick={analyze}
        disabled={loading}
        className="mt-4 flex items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 py-2.5 text-xs font-medium text-white transition-transform hover:-translate-y-px disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? "Analysiere…" : "Telemetrie analysieren"}
      </button>
    </div>
  );
};
