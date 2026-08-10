import { useState } from "react";
import { MODE_META } from "../../lib/rf";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const ConfigModeSwitcher = ({ mode, sendAction }) => {
  const [busy, setBusy] = useState(false);

  const change = async (m) => {
    if (m === mode || busy) return;
    setBusy(true);
    sendAction({ action: "set_mode", mode: m }); // sofortiges Feedback via WS
    try {
      await fetch(`${BACKEND_URL}/api/config/mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: m }),
      });
    } catch (e) {
      /* noop */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="mode-switcher" className="grid grid-cols-4 gap-2">
      {Object.entries(MODE_META).map(([key, meta]) => {
        const active = mode === key;
        return (
          <button
            key={key}
            data-testid={`mode-switch-${key}`}
            onClick={() => change(key)}
            className={`group relative flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-transform hover:-translate-y-px ${
              active ? "border-zinc-900 bg-zinc-900" : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: active ? meta.color : "#d4d4d8" }}
              />
              <span className={`text-xs font-semibold ${active ? "text-white" : "text-zinc-800"}`}>
                {meta.label}
              </span>
            </span>
            <span className={`text-[10px] leading-tight ${active ? "text-zinc-300" : "text-zinc-400"}`}>
              {meta.desc}
            </span>
          </button>
        );
      })}
    </div>
  );
};
