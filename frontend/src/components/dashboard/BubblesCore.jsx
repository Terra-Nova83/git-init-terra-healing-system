import { motion, AnimatePresence } from "framer-motion";
import { ENTITY_META } from "../../lib/rf";

// Bubbles Core: zentrale Blasen-Visualisierung der erkannten Objekte.
export const BubblesCore = ({ frame }) => {
  const entities = frame?.entities || [];
  const fusion = frame?.fusion?.score ?? 0;

  return (
    <div data-testid="bubbles-core" className="relative h-[240px] w-full overflow-hidden rounded-md bg-zinc-50 border border-zinc-100">
      {/* zentrale Fusion-Blase */}
      <motion.div
        className="absolute left-1/2 top-1/2 rounded-full flex items-center justify-center"
        style={{
          background: "radial-gradient(circle, rgba(37,99,235,0.18) 0%, rgba(37,99,235,0.04) 70%)",
          border: "1px solid rgba(37,99,235,0.35)",
        }}
        animate={{
          width: 70 + fusion * 90,
          height: 70 + fusion * 90,
          x: "-50%",
          y: "-50%",
        }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      >
        <div className="text-center">
          <div className="font-mono text-lg font-semibold tabular-nums text-zinc-900" data-testid="bubbles-core-value">
            {(fusion * 100).toFixed(0)}
          </div>
          <div className="text-[9px] uppercase tracking-wider text-zinc-400">Core</div>
        </div>
      </motion.div>

      {/* Entitäten als schwebende Blasen */}
      <AnimatePresence>
        {entities.map((e) => {
          const meta = ENTITY_META[e.type] || ENTITY_META.human;
          const size = 22 + e.confidence * 34;
          const left = 50 + e.x * 38;
          const top = 50 + e.y * 38;
          return (
            <motion.div
              key={e.id}
              data-testid={`bubble-${e.id}`}
              className="absolute rounded-full flex items-center justify-center"
              initial={{ scale: 0, opacity: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 0.45 + e.confidence * 0.5,
                left: `${left}%`,
                top: `${top}%`,
                width: size,
                height: size,
              }}
              transition={{ type: "spring", stiffness: 90, damping: 18 }}
              style={{
                marginLeft: -size / 2,
                marginTop: -size / 2,
                backgroundColor: `${meta.color}22`,
                border: `1px solid ${meta.color}`,
              }}
            >
              <span className="font-mono text-[8px] font-medium" style={{ color: meta.color }}>
                {Math.round(e.confidence * 100)}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {entities.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xs text-zinc-400 font-mono mt-16">keine Objekte erfasst</span>
        </div>
      )}
    </div>
  );
};
