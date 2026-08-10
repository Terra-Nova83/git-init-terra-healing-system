import { useEffect, useState } from "react";
import { Database, RefreshCw } from "lucide-react";
import { MODE_META } from "../lib/rf";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/sessions`);
      setSessions(await res.json());
    } catch (e) {
      /* noop */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="col-span-full p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-zinc-900" strokeWidth={1.5} />
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">Persistierte Sessions</h2>
          </div>
          <button
            data-testid="refresh-sessions"
            onClick={load}
            className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Aktualisieren
          </button>
        </div>

        <div data-testid="sessions-list" className="space-y-2">
          {sessions.length === 0 && !loading && (
            <p className="text-sm text-zinc-400 font-mono">keine Sessions gespeichert</p>
          )}
          {sessions.map((s) => {
            const color = MODE_META[s.mode]?.color || "#71717a";
            return (
              <div
                key={s.session_id}
                data-testid="session-row"
                className="rounded-md border border-zinc-200 bg-white p-4 flex items-center justify-between"
              >
                <div>
                  <div className="font-mono text-xs text-zinc-900">{s.session_id}</div>
                  <div className="font-mono text-[11px] text-zinc-400 mt-0.5">
                    {new Date(s.started_at).toLocaleString("de-DE")}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="rounded-full px-2.5 py-0.5 text-[11px] font-mono font-medium" style={{ backgroundColor: `${color}18`, color }}>
                    {s.mode}
                  </span>
                  <div className="text-right">
                    <div className="font-mono text-lg font-semibold tabular-nums text-zinc-900">{s.frames ?? 0}</div>
                    <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Frames</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
