import { motion, AnimatePresence } from "framer-motion";
import { ENTITY_META, MODE_META } from "../../lib/rf";

// Virtuelle Darstellung des scannbaren Feldes:
// Radar-Canvas, in dem sich die elektromagnetischen Frequenzen (Wellen) entfalten.
export const VirtualScannableField = ({ frame }) => {
  const entities = frame?.entities || [];
  const mode = frame?.mode || "normal";
  const modeColor = MODE_META[mode]?.color || "#2563eb";
  const rings = [1, 2, 3, 4];

  return (
    <div data-testid="virtual-field" className="relative w-full aspect-square max-h-[440px] mx-auto">
      <svg viewBox="0 0 400 400" className="w-full h-full">
        <defs>
          <radialGradient id="fieldGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={modeColor} stopOpacity="0.10" />
            <stop offset="100%" stopColor={modeColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="400" height="400" fill="url(#fieldGlow)" />

        {/* konzentrische Ringe */}
        {rings.map((r) => (
          <circle
            key={r}
            cx="200"
            cy="200"
            r={r * 45}
            fill="none"
            stroke="#e4e4e7"
            strokeWidth="1"
          />
        ))}
        {/* Distanz-Beschriftung */}
        {rings.map((r) => (
          <text key={`t-${r}`} x="204" y={200 - r * 45 + 12} fontSize="8" fill="#a1a1aa" className="font-mono">
            {r * 3}m
          </text>
        ))}

        {/* Achsen */}
        <line x1="200" y1="0" x2="200" y2="400" stroke="#e4e4e7" strokeWidth="1" />
        <line x1="0" y1="200" x2="400" y2="200" stroke="#e4e4e7" strokeWidth="1" />

        {/* sich entfaltende EM-Wellen */}
        {[0, 1, 2].map((i) => (
          <circle
            key={`wave-${i}`}
            cx="200"
            cy="200"
            r="180"
            fill="none"
            stroke={modeColor}
            strokeWidth="1.5"
            style={{
              transformOrigin: "200px 200px",
              animation: `wave-out 3s ease-out ${i * 1}s infinite`,
            }}
          />
        ))}

        {/* rotierender Radar-Sweep */}
        <g style={{ transformOrigin: "200px 200px", animation: "radar-sweep 4s linear infinite" }}>
          <defs>
            <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={modeColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={modeColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M200 200 L200 20 A180 180 0 0 1 335 90 Z" fill="url(#sweep)" />
        </g>

        {/* zentrale Antenne */}
        <circle cx="200" cy="200" r="4" fill={modeColor} />
      </svg>

      {/* Entitäten (HTML overlay für flüssige spring-Bewegung) */}
      <AnimatePresence>
        {entities.map((e) => {
          const meta = ENTITY_META[e.type] || ENTITY_META.human;
          const left = 50 + e.x * 45;
          const top = 50 + e.y * 45;
          return (
            <motion.div
              key={e.id}
              data-testid={`field-entity-${e.id}`}
              className="absolute"
              initial={{ scale: 0, opacity: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, left: `${left}%`, top: `${top}%` }}
              transition={{ type: "spring", stiffness: 90, damping: 18 }}
              style={{ transform: "translate(-50%, -50%)" }}
            >
              <div className="flex flex-col items-center">
                <span
                  className="block rounded-full"
                  style={{
                    width: 10 + e.confidence * 10,
                    height: 10 + e.confidence * 10,
                    backgroundColor: meta.color,
                    boxShadow: `0 0 12px ${meta.color}`,
                  }}
                />
                <span className="mt-0.5 font-mono text-[8px] text-zinc-500 whitespace-nowrap">
                  {meta.label} · {e.distance}m
                </span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
