import { ENTITY_META, MODE_META } from "./rf";

function drawFrame(ctx, frame, size) {
  const cx = size / 2;
  const cy = size / 2;
  const scale = size * 0.4;

  // Hintergrund
  const bg = ctx.createLinearGradient(0, 0, 0, size);
  bg.addColorStop(0, "#ffffff");
  bg.addColorStop(1, "#f4f4f5");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  if (!frame) return;

  const mode = frame.mode || "normal";
  const modeColor = MODE_META[mode]?.color || "#2563eb";
  const signalScore = frame.models?.signal?.score ?? 0;

  // Signal-Heatmap (Radialverlauf)
  const heat = ctx.createRadialGradient(cx, cy, 4, cx, cy, scale * 1.25);
  const hc = hexFromHeat(signalScore);
  heat.addColorStop(0, `rgba(${hc},${(0.16 + 0.5 * signalScore).toFixed(3)})`);
  heat.addColorStop(0.5, `rgba(${hc},${(0.06 + 0.25 * signalScore).toFixed(3)})`);
  heat.addColorStop(1, `rgba(${hc},0)`);
  ctx.fillStyle = heat;
  ctx.beginPath();
  ctx.arc(cx, cy, scale * 1.25, 0, Math.PI * 2);
  ctx.fill();

  // konzentrische Ringe
  ctx.strokeStyle = "#d4d4d8";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, (scale / 4) * i, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "10px monospace";
    ctx.fillText(`${i * 3}m`, cx + 3, cy - (scale / 4) * i + 12);
  }
  // Achsen
  ctx.beginPath();
  ctx.moveTo(cx, cy - scale); ctx.lineTo(cx, cy + scale);
  ctx.moveTo(cx - scale, cy); ctx.lineTo(cx + scale, cy);
  ctx.stroke();

  // zentrale Antenne
  ctx.fillStyle = modeColor;
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fill();

  // Entitäten
  const entities = frame.entities || [];
  for (const e of entities) {
    const meta = ENTITY_META[e.type] || ENTITY_META.human;
    const x = cx + e.x * scale;
    const y = cy + e.y * scale;
    const r = 5 + e.confidence * 9;
    // Glow
    ctx.fillStyle = meta.color + "33";
    ctx.beginPath(); ctx.arc(x, y, r * 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = meta.color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3f3f46";
    ctx.font = "9px monospace";
    ctx.fillText(`${meta.label} ${Math.round(e.confidence * 100)}%`, x + r + 3, y + 3);
  }

  // HUD
  ctx.fillStyle = "#18181b";
  ctx.font = "bold 13px monospace";
  ctx.fillText(`RF·SENSE  #${frame.seq}`, 14, 22);
  ctx.fillStyle = modeColor;
  ctx.font = "11px monospace";
  ctx.fillText(`MODE ${mode.toUpperCase()}  ·  ${frame.raw?.signal?.band_label || ""}`, 14, 40);

  // Fusion/Confidence Balken unten
  const fs = frame.fusion?.score ?? 0;
  const cf = frame.confidence?.value ?? 0;
  drawBar(ctx, 14, size - 44, "FUSION", fs, "#2563eb");
  drawBar(ctx, 14, size - 24, "CONF", cf, "#10b981");
}

function drawBar(ctx, x, y, label, value, color) {
  ctx.fillStyle = "#71717a";
  ctx.font = "10px monospace";
  ctx.fillText(label, x, y - 2);
  const w = 160;
  ctx.fillStyle = "#e4e4e7";
  ctx.fillRect(x + 54, y - 10, w, 8);
  ctx.fillStyle = color;
  ctx.fillRect(x + 54, y - 10, w * value, 8);
  ctx.fillStyle = "#18181b";
  ctx.fillText(`${Math.round(value * 100)}%`, x + 54 + w + 6, y - 2);
}

function hexFromHeat(v) {
  // v 0..1 -> blau..grün..gelb..rot (rgb string)
  const c = Math.max(0, Math.min(1, v));
  const h = (1 - c) * 0.66; // 0.66=blau, 0=rot
  const { r, g, b } = hslToRgb(h, 0.9, 0.5);
  return `${r},${g},${b}`;
}

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

// Nimmt die Session-Wiedergabe als WebM-Video auf.
export async function recordReplay(frames, { fps = 12, size = 640, maxFrames = 180, onProgress } = {}) {
  if (!frames || frames.length === 0) throw new Error("keine Frames");
  if (typeof MediaRecorder === "undefined") throw new Error("MediaRecorder nicht unterstützt");

  // gleichmäßiges Downsampling für kurze, zügige Aufnahme
  let seq = frames;
  if (frames.length > maxFrames) {
    const stride = frames.length / maxFrames;
    seq = Array.from({ length: maxFrames }, (_, i) => frames[Math.floor(i * stride)]);
  }

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  drawFrame(ctx, seq[0], size); // erster Frame vor Start

  const stream = canvas.captureStream(0);
  const track = stream.getVideoTracks()[0];
  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5_000_000 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  const stopped = new Promise((resolve) => { rec.onstop = () => resolve(); });

  rec.start(500); // Timeslice -> liefert Chunks auch während der Aufnahme
  const dt = 1000 / fps;
  for (let i = 0; i < seq.length; i++) {
    drawFrame(ctx, seq[i], size);
    if (track.requestFrame) track.requestFrame();
    else if (stream.requestFrame) stream.requestFrame();
    if (onProgress) onProgress((i + 1) / seq.length);
    await new Promise((r) => setTimeout(r, dt));
  }
  try { rec.stop(); } catch (e) { /* noop */ }

  // Fallback-Timeout, falls onstop im aktuellen Browser nicht feuert
  await Promise.race([stopped, new Promise((r) => setTimeout(r, 4000))]);

  const blob = new Blob(chunks, { type: "video/webm" });
  if (blob.size === 0) {
    throw new Error("Aufnahme leer – dieser Browser unterstützt Video-Encoding nicht.");
  }
  return blob;
}
