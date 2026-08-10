import { Radio, Activity, Users, Cpu } from "lucide-react";

const STATUS_META = {
  connected: { label: "LIVE", color: "bg-emerald-500", text: "text-emerald-600" },
  connecting: { label: "VERBINDE", color: "bg-amber-500", text: "text-amber-600" },
  reconnecting: { label: "RECONNECT", color: "bg-amber-500", text: "text-amber-600" },
  error: { label: "FEHLER", color: "bg-red-500", text: "text-red-600" },
};

export const Header = ({ status, frame, view, setView }) => {
  const s = STATUS_META[status] || STATUS_META.connecting;
  const clients = frame?.clients ?? 0;
  const seq = frame?.seq ?? 0;

  return (
    <header
      data-testid="app-header"
      className="col-span-full h-16 sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-zinc-200 flex items-center justify-between px-4 sm:px-6"
    >
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-md bg-zinc-900 flex items-center justify-center">
          <Radio className="h-5 w-5 text-white" strokeWidth={1.5} />
        </div>
        <div className="leading-tight">
          <h1 className="text-base font-bold tracking-tight text-zinc-900">RF·SENSE</h1>
          <p className="text-[11px] text-zinc-500 font-mono">5G / LTE / UMTS / WiFi-CSI Sensing</p>
        </div>
      </div>

      <nav className="hidden md:flex items-center gap-1 bg-zinc-100 rounded-md p-1">
        <button
          data-testid="nav-dashboard"
          onClick={() => setView("dashboard")}
          className={`text-xs font-medium px-3 py-1.5 rounded transition-colors ${view === "dashboard" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"}`}
        >
          Dashboard
        </button>
        <button
          data-testid="nav-field3d"
          onClick={() => setView("field3d")}
          className={`text-xs font-medium px-3 py-1.5 rounded transition-colors ${view === "field3d" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"}`}
        >
          3D-Feld
        </button>
        <button
          data-testid="nav-diagram"
          onClick={() => setView("diagram")}
          className={`text-xs font-medium px-3 py-1.5 rounded transition-colors ${view === "diagram" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"}`}
        >
          System-Diagramm
        </button>
        <button
          data-testid="nav-sessions"
          onClick={() => setView("sessions")}
          className={`text-xs font-medium px-3 py-1.5 rounded transition-colors ${view === "sessions" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"}`}
        >
          Sessions
        </button>
      </nav>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-zinc-500">
          <Cpu className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span data-testid="seq-counter" className="tabular-nums">#{seq}</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-zinc-500">
          <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span data-testid="client-count" className="tabular-nums">{clients}</span>
        </div>
        <div
          data-testid="ws-status"
          data-status={status}
          className="flex items-center gap-2 border border-zinc-200 rounded-full pl-2 pr-3 py-1"
        >
          <span className={`relative flex h-2 w-2`}>
            <span className={`absolute inline-flex h-full w-full rounded-full ${s.color} opacity-75 animate-pulse-dot`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${s.color}`} />
          </span>
          <span className={`text-[11px] font-mono font-medium ${s.text}`}>{s.label}</span>
        </div>
      </div>
    </header>
  );
};
