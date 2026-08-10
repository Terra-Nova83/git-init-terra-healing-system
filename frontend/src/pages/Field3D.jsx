import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, Html } from "@react-three/drei";
import * as THREE from "three";
import { ENTITY_META, MODE_META } from "../lib/rf";
import { Move3d, MousePointer2 } from "lucide-react";

const R = 4; // Feldradius

const ENTITY_SHAPE = {
  human: { h: 1.2, kind: "capsule" },
  animal: { h: 0.4, kind: "sphere" },
  structure: { h: 1.6, kind: "box" },
};

function EntityMesh({ entity }) {
  const ref = useRef();
  const meta = ENTITY_META[entity.type] || ENTITY_META.human;
  const shape = ENTITY_SHAPE[entity.type] || ENTITY_SHAPE.human;
  const target = useMemo(() => new THREE.Vector3(entity.x * R, shape.h / 2, entity.y * R), [entity.x, entity.y, shape.h]);

  useFrame(() => {
    if (ref.current) ref.current.position.lerp(target, 0.15);
  });

  return (
    <group ref={ref} position={[entity.x * R, shape.h / 2, entity.y * R]}>
      <mesh castShadow>
        {shape.kind === "capsule" && <capsuleGeometry args={[0.18, shape.h - 0.36, 8, 16]} />}
        {shape.kind === "sphere" && <sphereGeometry args={[0.22, 20, 20]} />}
        {shape.kind === "box" && <boxGeometry args={[0.5, shape.h, 0.5]} />}
        <meshStandardMaterial color={meta.color} emissive={meta.color} emissiveIntensity={0.35} roughness={0.4} />
      </mesh>
      {/* Bodenmarkierung */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -shape.h / 2 + 0.01, 0]}>
        <ringGeometry args={[0.28, 0.34, 32]} />
        <meshBasicMaterial color={meta.color} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <Html center distanceFactor={12} position={[0, shape.h / 2 + 0.4, 0]}>
        <div className="whitespace-nowrap rounded bg-white/90 border border-zinc-200 px-1.5 py-0.5 font-mono text-[9px] text-zinc-700 shadow-sm">
          {meta.label} · {Math.round(entity.confidence * 100)}% · {entity.distance}m
        </div>
      </Html>
    </group>
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
      {/* Kern-Antenne */}
      <mesh position={[0, 0.25, 0]}>
        <coneGeometry args={[0.15, 0.5, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
      </mesh>
      {/* Scan-Dome (Halbkugel-Drahtgitter) */}
      <mesh>
        <sphereGeometry args={[R, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.06} />
      </mesh>
    </group>
  );
}

function Scene({ frame }) {
  const mode = frame?.mode || "normal";
  const color = MODE_META[mode]?.color || "#2563eb";
  const entities = frame?.entities || [];

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[6, 10, 4]} intensity={1.1} castShadow />
      <Grid
        args={[24, 24]}
        cellSize={1}
        cellColor="#e4e4e7"
        sectionSize={4}
        sectionColor="#cbd5e1"
        fadeDistance={26}
        infiniteGrid
        position={[0, -0.01, 0]}
      />
      <Rings color={color} />
      <RadarSweep color={color} />
      <WaveRing delay={0} color={color} />
      <WaveRing delay={1} color={color} />
      <WaveRing delay={2} color={color} />
      {entities.map((e) => (
        <EntityMesh key={e.id} entity={e} />
      ))}
      <OrbitControls
        enablePan={false}
        minDistance={4}
        maxDistance={22}
        maxPolarAngle={Math.PI / 2.15}
        target={[0, 0.5, 0]}
      />
    </>
  );
}

export default function Field3D({ frame }) {
  const mode = frame?.mode || "normal";
  const meta = MODE_META[mode];
  const signal = frame?.raw?.signal || {};

  return (
    <div className="col-span-full relative" style={{ height: "calc(100vh - 4rem)" }}>
      {/* Overlay-Info */}
      <div className="absolute left-4 top-4 z-10 rounded-md border border-zinc-200 bg-white/85 backdrop-blur px-4 py-3">
        <div className="flex items-center gap-2">
          <Move3d className="h-4 w-4 text-zinc-900" strokeWidth={1.5} />
          <h2 className="text-sm font-bold tracking-tight text-zinc-900">3D-Scan-Feld</h2>
        </div>
        <div className="mt-2 space-y-0.5 font-mono text-[11px] text-zinc-600">
          <div>Modus: <span style={{ color: meta?.color }}>{meta?.label}</span></div>
          <div>Band: {signal.band_label} · {signal.frequency_mhz} MHz</div>
          <div>Objekte: <span className="tabular-nums" data-testid="field3d-entities">{frame?.entities?.length ?? 0}</span></div>
        </div>
      </div>

      <div className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white/85 backdrop-blur px-3 py-2 font-mono text-[11px] text-zinc-500">
        <MousePointer2 className="h-3.5 w-3.5" /> ziehen zum Drehen · scrollen zum Zoomen
      </div>

      {/* Legende */}
      <div className="absolute left-4 bottom-4 z-10 flex gap-3 rounded-md border border-zinc-200 bg-white/85 backdrop-blur px-4 py-2">
        {Object.entries(ENTITY_META).map(([k, m]) => (
          <span key={k} className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.color }} />
            {m.label}
          </span>
        ))}
      </div>

      <Canvas
        data-testid="field3d-canvas"
        shadows
        camera={{ position: [7, 6, 7], fov: 50 }}
        style={{ background: "linear-gradient(180deg, #ffffff 0%, #f4f4f5 100%)" }}
      >
        <Scene frame={frame} />
      </Canvas>
    </div>
  );
}
