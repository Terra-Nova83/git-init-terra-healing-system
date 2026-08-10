export const MODE_META = {
  normal: { label: "Normal", desc: "Gemischte Aktivität", color: "#2563eb", ring: "ring-blue-500", text: "text-blue-600", bg: "bg-blue-600" },
  active: { label: "Active", desc: "Viel Bewegung", color: "#10b981", ring: "ring-emerald-500", text: "text-emerald-600", bg: "bg-emerald-500" },
  idle: { label: "Idle", desc: "Wenig Bewegung", color: "#f59e0b", ring: "ring-amber-500", text: "text-amber-600", bg: "bg-amber-500" },
  anomaly: { label: "Anomaly", desc: "Ungewöhnliche Werte", color: "#ef4444", ring: "ring-red-500", text: "text-red-600", bg: "bg-red-500" },
};

export const MODEL_META = {
  presence: { label: "Presence", color: "#8b5cf6", hint: "Anwesenheit" },
  motion: { label: "Motion", color: "#f59e0b", hint: "Bewegung" },
  signal: { label: "Signal", color: "#10b981", hint: "Signalqualität" },
  stability: { label: "Stability", color: "#0ea5e9", hint: "Stabilität" },
};

export const ENTITY_META = {
  human: { label: "Mensch", color: "#8b5cf6" },
  animal: { label: "Tier", color: "#f59e0b" },
  structure: { label: "Gebäude", color: "#0ea5e9" },
};

export function pct(v) {
  return `${Math.round((v || 0) * 100)}%`;
}
