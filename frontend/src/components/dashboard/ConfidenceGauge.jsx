import { motion } from "framer-motion";

// Halbkreis-Gauge für die ConfidenceEngine (SVG).
export const ConfidenceGauge = ({ value = 0, level = "low" }) => {
  const radius = 70;
  const circ = Math.PI * radius; // Halbkreis
  const offset = circ * (1 - value);

  const color = value >= 0.75 ? "#10b981" : value >= 0.45 ? "#f59e0b" : "#ef4444";
  const levelLabel = { high: "HIGH", medium: "MEDIUM", low: "LOW" }[level] || "—";

  return (
    <div data-testid="confidence-gauge" className="flex flex-col items-center">
      <svg viewBox="0 0 180 100" className="w-full max-w-[220px]">
        <path
          d="M 20 90 A 70 70 0 0 1 160 90"
          fill="none"
          stroke="#e4e4e7"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <motion.path
          d="M 20 90 A 70 70 0 0 1 160 90"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={false}
          animate={{ strokeDashoffset: offset }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        />
        <text x="90" y="72" textAnchor="middle" className="font-mono" fontSize="26" fontWeight="600" fill="#18181b">
          {Math.round(value * 100)}
        </text>
        <text x="90" y="88" textAnchor="middle" fontSize="9" fill="#a1a1aa">CONFIDENCE %</text>
      </svg>
      <span
        data-testid="confidence-level"
        className="mt-1 rounded-full px-3 py-0.5 text-[10px] font-mono font-semibold"
        style={{ backgroundColor: `${color}18`, color }}
      >
        {levelLabel}
      </span>
    </div>
  );
};
