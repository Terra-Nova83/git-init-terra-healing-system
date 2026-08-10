import { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, Html } from "@react-three/drei";
import * as THREE from "three";
import { ENTITY_META, MODE_META } from "../lib/rf";
import { Move3d, MousePointer2, Flame, Crosshair } from "lucide-react";

const R = 4; // Feldradius

const ENTITY_SHAPE = {
  human: { h: 1.2, kind: "capsule" },
  animal: { h: 0.4, kind: "sphere" },
  structure: { h: 1.6, kind: "box" },
};

// Konfidenz -> Heat-Farbe (blau = kalt/niedrig, rot = heiß/hoch)
function heatColor(v) {
  const c = new THREE.Color();
  c.setHSL((1 - Math.min(1, Math.max(0, v))) * 0.66, 0.9, 0.5);
  return c;
}

function EntityMesh({ entity, selected, onSelect }) {
  const ref = useRef();
  const meta = ENTITY_META[entity.type] || ENTITY_META.human;
  const shape = ENTITY_SHAPE[entity.type] || ENTITY_SHAPE.human;
  const target = useMemo(
    () => new THREE.Vector3(entity.x * R, shape.h / 2, entity.y * R),
    [entity.x, entity.y, shape.h]
  );

  useFrame(() => {
    if (ref.current) ref.current.position.lerp(target, 0.15);
  });

  return (
    <group ref={ref} position={[entity.x * R, shape.h / 2, entity.y * R]}>
      <mesh
        castShadow
        onClick={(e) => { e.stopPropagation(); onSelect(entity.id); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { document.body.style.cursor = "default"; }}
      >
        {shape.kind === "capsule" && <capsuleGeometry args={[0.18, shape.h - 0.36, 8, 16]} />}
        {shape.kind === "sphere" && <sphereGeometry args={[0.22, 20, 20]} />}
        {shape.kind === "box" && <boxGeometry args={[0.5, shape.h, 0.5]} />}
        <meshStandardMaterial
          color={meta.color}
          emissive={meta.color}
          emissiveIntensity={selected ? 0.9 : 0.35}
          roughness={0.4}
        />
      </mesh>
      {/* Auswahl-Highlight */}
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -shape.h / 2 + 0.02, 0]}>
          <ringGeometry args={[0.42, 0.5, 40]} />
          <meshBasicMaterial color="#18181b" transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* Bodenmarkierung */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -shape.h / 2 + 0.01, 0]}>
        <ringGeometry args={[0.28, 0.34, 32]} />
        <meshBasicMaterial color={meta.color} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <Html center distanceFactor={12} position={[0, shape.h / 2 + 0.4, 0]}>
        <div className={`whitespace-nowrap rounded border px-1.5 py-0.5 font-mono text-[9px] shadow-sm ${selected ? "bg-zinc-900 text-white border-zinc-900" : "bg-white/90 text-zinc-700 border-zinc-200"}`}>
          {meta.label} · {Math.round(entity.confidence * 100)}% · {entity.distance}m
        </div>
      </Html>
    </group>
  );
}

// Heat-Zone unter jedem Objekt (Konfidenz-basiert)
function HeatDisc({ entity }) {
  const ref = useRef();
  const target = useMemo(() => new THREE.Vector3(entity.x * R, 0.015, entity.y * R), [entity.x, entity.y]);
  const color = useMemo(() => heatColor(entity.confidence), [entity.confidence]);
  const radius = 0.6 + entity.confidence * 1.6;
  useFrame(() => {
    if (ref.current) ref.current.position.lerp(target, 0.15);
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[entity.x * R, 0.015, entity.y * R]}>
      <circleGeometry args={[radius, 40]} />
      <meshBasicMaterial color={color} transparent opacity={0.28} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function WaveRing({ delay, color }) {
  const ref = useRef();
  useFrame((state) => {
    const t = (state.clock.elapsedTime + delay) % 3;
    const s = 0.1 + (t / 3) * R;
    if (ref.current) {
      ref.current.scale.set(s, s, s);
      ref.current.material.opacity = 0.5 * (1 - t / 3);
    }
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.96, 1, 64]} />
      <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} />
    </mesh>
  );
}

function RadarSweep({ color }) {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y -= delta * 0.6;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
      <circleGeometry args={[R, 48, 0, Math.PI / 4]} />
      <meshBasicMaterial color={color} transparent opacity={0.12} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Rings({ color }) {
  return (
    <group>
      {[1, 2, 3, 4].map((i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[i - 0.015, i, 64]} />
          <meshBasicMaterial color="#d4d4d8" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, 0.25, 0]}>
        <coneGeometry args={[0.15, 0.5, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
      </mesh>
      <mesh>
        <sphereGeometry args={[R, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.06} />
      </mesh>
    </group>
  );
}

// Kamera fliegt zum fokussierten Objekt (verfeinert: richtungserhaltend, ruckfrei)
function CameraRig({ focusEntity, controlsRef }) {
  const settle = useRef(0);
  useFrame((state, delta) => {
    const ctrl = controlsRef.current;
    if (!focusEntity || !ctrl) { settle.current = 0; return; }
    const targetPos = new THREE.Vector3(focusEntity.x * R, 0.6, focusEntity.y * R);
    const cam = state.camera;

    // aktuelle horizontale Blickrichtung beibehalten -> kein Umspringen
    const dir = new THREE.Vector3().subVectors(cam.position, ctrl.target);
    dir.y = 0;
    if (dir.lengthSq() < 0.0001) dir.set(1, 0, 1);
    dir.normalize();

    const dist = 4.2;
    const desiredCam = new THREE.Vector3(
      targetPos.x + dir.x * dist,
      targetPos.y + 2.4,
      targetPos.z + dir.z * dist
    );

    // frameraten-unabhängige Glättung; verlangsamt beim Ankommen
    const a = 1 - Math.exp(-delta * 3.5);
    ctrl.target.lerp(targetPos, a);
    cam.position.lerp(desiredCam, a);
    ctrl.update();
  });
  return null;
}

// Ganzflächige Boden-Heatmap nach Signalstärke (Radialverlauf, heiß in der Mitte)
function GroundSignalHeat({ signalScore }) {
  const bucket = Math.round(signalScore * 20) / 20;
  const texture = useMemo(() => {
    const S = 256;
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const ctx = c.getContext("2d");
    const col = heatColor(bucket);
    const r = Math.round(col.r * 255), g = Math.round(col.g * 255), b = Math.round(col.b * 255);
    const grad = ctx.createRadialGradient(S / 2, S / 2, 8, S / 2, S / 2, S / 2);
    grad.addColorStop(0, `rgba(${r},${g},${b},${(0.18 + 0.55 * bucket).toFixed(3)})`);
    grad.addColorStop(0.45, `rgba(${r},${g},${b},${(0.08 + 0.32 * bucket).toFixed(3)})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  }, [bucket]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
      <circleGeometry args={[R * 1.35, 64]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Scene({ frame, focusId, onSelect, showHeat, focusEntity }) {
  const mode = frame?.mode || "normal";
  const color = MODE_META[mode]?.color || "#2563eb";
  const entities = frame?.entities || [];
  const controlsRef = useRef();
  const signalScore = frame?.models?.signal?.score ?? 0;

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[6, 10, 4]} intensity={1.1} castShadow />
      <Grid args={[24, 24]} cellSize={1} cellColor="#e4e4e7" sectionSize={4} sectionColor="#cbd5e1" fadeDistance={26} infiniteGrid position={[0, -0.01, 0]} />
      {showHeat && <GroundSignalHeat signalScore={signalScore} />}
      <Rings color={color} />
      <RadarSweep color={color} />
      <WaveRing delay={0} color={color} />
      <WaveRing delay={1} color={color} />
      <WaveRing delay={2} color={color} />
      {showHeat && entities.map((e) => <HeatDisc key={`h-${e.id}`} entity={e} />)}
      {entities.map((e) => (
        <EntityMesh key={e.id} entity={e} selected={e.id === focusId} onSelect={onSelect} />
      ))}
      {/* Klick ins Leere = Fokus lösen */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} onClick={() => onSelect(null)}>
        <circleGeometry args={[R * 1.4, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <CameraRig focusEntity={focusEntity} controlsRef={controlsRef} />
      <OrbitControls ref={controlsRef} makeDefault enablePan={false} minDistance={3} maxDistance={22} maxPolarAngle={Math.PI / 2.15} target={[0, 0.5, 0]} />
    </>
  );
}

export default function Field3D({ frame }) {
  const [focusId, setFocusId] = useState(null);
  const [showHeat, setShowHeat] = useState(true);
  const mode = frame?.mode || "normal";
  const meta = MODE_META[mode];
  const signal = frame?.raw?.signal || {};
  const entities = frame?.entities || [];
  const focusEntity = entities.find((e) => e.id === focusId) || null;

  return (
    <div className="col-span-full relative" style={{ height: "calc(100vh - 4rem)" }}>
      <div className="absolute left-4 top-4 z-10 rounded-md border border-zinc-200 bg-white/85 backdrop-blur px-4 py-3">
        <div className="flex items-center gap-2">
          <Move3d className="h-4 w-4 text-zinc-900" strokeWidth={1.5} />
          <h2 className="text-sm font-bold tracking-tight text-zinc-900">3D-Scan-Feld</h2>
        </div>
        <div className="mt-2 space-y-0.5 font-mono text-[11px] text-zinc-600">
          <div>Modus: <span style={{ color: meta?.color }}>{meta?.label}</span></div>
          <div>Band: {signal.band_label} · {signal.frequency_mhz} MHz</div>
          <div>Objekte: <span className="tabular-nums" data-testid="field3d-entities">{entities.length}</span></div>
          {focusEntity && (
            <div className="text-zinc-900">Fokus: {focusEntity.id} · {Math.round(focusEntity.confidence * 100)}%</div>
          )}
        </div>
      </div>

      {/* Steuerung */}
      <div className="absolute right-4 top-4 z-10 flex flex-col items-end gap-2">
        <div className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white/85 backdrop-blur px-3 py-2 font-mono text-[11px] text-zinc-500">
          <MousePointer2 className="h-3.5 w-3.5" /> ziehen · scrollen · Objekt klicken
        </div>
        <div className="flex items-center gap-2">
          <button
            data-testid="toggle-heatmap"
            onClick={() => setShowHeat((s) => !s)}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-[11px] font-medium transition-colors ${showHeat ? "border-red-300 bg-red-50 text-red-600" : "border-zinc-200 bg-white/85 text-zinc-600"}`}
          >
            <Flame className="h-3.5 w-3.5" /> Heatmap {showHeat ? "AN" : "AUS"}
          </button>
          <button
            data-testid="reset-focus"
            onClick={() => setFocusId(null)}
            disabled={!focusEntity}
            className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white/85 px-3 py-2 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
          >
            <Crosshair className="h-3.5 w-3.5" /> Fokus lösen
          </button>
        </div>
      </div>

      <div className="absolute left-4 bottom-4 z-10 flex gap-3 rounded-md border border-zinc-200 bg-white/85 backdrop-blur px-4 py-2">
        {Object.entries(ENTITY_META).map(([k, m]) => (
          <span key={k} className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.color }} />
            {m.label}
          </span>
        ))}
      </div>

      {/* Heat-Legende */}
      {showHeat && (
        <div className="absolute right-4 bottom-4 z-10 rounded-md border border-zinc-200 bg-white/85 backdrop-blur px-3 py-2">
          <div className="font-mono text-[10px] text-zinc-500 mb-1">Heat · Signal & Konfidenz</div>
          <div className="h-2 w-32 rounded-full" style={{ background: "linear-gradient(90deg, #2563eb, #22c55e, #eab308, #ef4444)" }} />
          <div className="flex justify-between font-mono text-[9px] text-zinc-400 mt-0.5"><span>0%</span><span>100%</span></div>
        </div>
      )}

      <Canvas data-testid="field3d-canvas" shadows camera={{ position: [7, 6, 7], fov: 50 }} style={{ background: "linear-gradient(180deg, #ffffff 0%, #f4f4f5 100%)" }}>
        <Scene frame={frame} focusId={focusId} onSelect={setFocusId} showHeat={showHeat} focusEntity={focusEntity} />
      </Canvas>
    </div>
  );
}
