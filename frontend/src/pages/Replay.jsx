import { useEffect, useRef, useState, useCallback } from "react";
import { VirtualScannableField } from "../components/dashboard/VirtualScannableField";
import { BubblesCore } from "../components/dashboard/BubblesCore";
import { ConfidenceGauge } from "../components/dashboard/ConfidenceGauge";
import { ModelScorePanels } from "../components/dashboard/ModelScorePanels";
import { ExportButtons } from "../components/dashboard/ExportButtons";
import { recordReplay } from "../lib/replayVideo";
import { MODE_META } from "../lib/rf";
import { Play, Pause, SkipBack, SkipForward, Film, Video } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const SPEEDS = [0.5, 1, 2, 4];

export default function Replay() {
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState("");
  const [frames, setFrames] = useState([]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recProgress, setRecProgress] = useState(0);
  const [recError, setRecError] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/sessions`)
      .then((r) => r.json())
      .then((data) => {
        setSessions(data);
        const withFrames = data.find((s) => s.frames > 0);
        if (withFrames) setSessionId(withFrames.session_id);
      })
      .catch(() => {});
  }, []);

  const loadFrames = useCallback((sid) => {
    if (!sid) return;
    setLoading(true);
    setPlaying(false);
    fetch(`${BACKEND_URL}/api/sessions/${sid}/frames?limit=400&light=1`)
      .then((r) => r.json())
      .then((data) => {
        setFrames(data);
        setIdx(0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadFrames(sessionId); }, [sessionId, loadFrames]);

  useEffect(() => {
    if (playing && frames.length > 0) {
      timerRef.current = setInterval(() => {
        setIdx((i) => {
          if (i >= frames.length - 1) { setPlaying(false); return i; }
          return i + 1;
        });
      }, 400 / speed);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing, speed, frames.length]);

  const frame = frames[idx] || null;
  const fusion = frame?.fusion || {};
  const confidence = frame?.confidence || {};
  const mode = frame?.mode || "normal";
  const modeColor = MODE_META[mode]?.color;

  const step = (d) => {
    setPlaying(false);
    setIdx((i) => Math.min(frames.length - 1, Math.max(0, i + d)));
  };

  const exportVideo = async () => {
    if (!frames.length || recording) return;
    setPlaying(false);
    setRecording(true);
    setRecProgress(0);
    setRecError(null);
    try {
      const blob = await recordReplay(frames, { fps: 12, size: 640, onProgress: setRecProgress });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `replay_${new Date().toISOString().replace(/[:.]/g, "-")}.webm`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (e) {
      console.error("Video-Export fehlgeschlagen", e);
      setRecError(e?.message || "Video-Export fehlgeschlagen");
    } finally {
      setRecording(false);
    }
  };

  return (
    <div className="col-span-full p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Steuerleiste */}
      <div className="lg:col-span-12 bg-white border border-zinc-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Film className="h-4 w-4 text-zinc-900" strokeWidth={1.5} />
            <h2 className="text-sm font-bold tracking-tight text-zinc-900">Session-Replay</h2>
          </div>
          <div className="flex items-center gap-2">
            <ExportButtons history={frames} />
            <button
              data-testid="replay-video-export"
              onClick={exportVideo}
              disabled={!frames.length || recording}
              className="flex items-center gap-1 rounded border border-zinc-200 px-2 py-1 font-mono text-[11px] text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
            >
              <Video className="h-3 w-3" />
              {recording ? `Video ${Math.round(recProgress * 100)}%` : "Video"}
            </button>
          </div>
        </div>

        {recError && (
          <div data-testid="replay-video-error" className="mb-2 text-[11px] font-mono text-red-500">
            ⚠ {recError}
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <select
            data-testid="replay-session-select"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="rounded-md border border-zinc-200 bg-white px-3 py-2 font-mono text-xs text-zinc-700 max-w-full md:max-w-[340px]"
          >
            {sessions.length === 0 && <option>keine Sessions</option>}
            {sessions.map((s) => (
              <option key={s.session_id} value={s.session_id}>
                {new Date(s.started_at).toLocaleString("de-DE")} · {s.frames} Frames · {s.mode}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5">
            <button data-testid="replay-stepback" onClick={() => step(-1)} className="rounded-md border border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-50">
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              data-testid="replay-playpause"
              onClick={() => setPlaying((p) => !p)}
              disabled={frames.length === 0}
              className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-xs font-medium text-white disabled:opacity-40"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? "Pause" : "Abspielen"}
            </button>
            <button data-testid="replay-stepforward" onClick={() => step(1)} className="rounded-md border border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-50">
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1 bg-zinc-100 rounded-md p-1">
            {SPEEDS.map((sp) => (
              <button
                key={sp}
                data-testid={`replay-speed-${sp}`}
                onClick={() => setSpeed(sp)}
                className={`rounded px-2 py-1 font-mono text-[11px] ${speed === sp ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"}`}
              >
                {sp}×
              </button>
            ))}
          </div>

          <div className="font-mono text-xs text-zinc-500 tabular-nums md:ml-auto">
            {loading ? "lädt…" : (
              <span data-testid="replay-position">Frame {frames.length ? idx + 1 : 0} / {frames.length} · #{frame?.seq ?? "—"}</span>
            )}
          </div>
        </div>

        {/* Scrubber */}
        <input
          data-testid="replay-scrubber"
          type="range"
          min={0}
          max={Math.max(0, frames.length - 1)}
          value={idx}
          onChange={(e) => { setPlaying(false); setIdx(Number(e.target.value)); }}
          className="mt-4 w-full accent-zinc-900"
        />
      </div>

      {frames.length === 0 ? (
        <div className="lg:col-span-12 text-center text-sm text-zinc-400 font-mono py-16">
          Keine Frames für diese Session. Wähle eine Session mit gespeicherten Frames.
        </div>
      ) : (
        <>
          <section className="lg:col-span-7 bg-white border border-zinc-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold tracking-tight text-zinc-900">Scan-Feld (Wiedergabe)</h3>
              <span className="font-mono text-[11px] text-zinc-500">
                {frame?.timestamp ? new Date(frame.timestamp).toLocaleTimeString("de-DE") : ""}
              </span>
            </div>
            <VirtualScannableField frame={frame} />
          </section>

          <div className="lg:col-span-5 flex flex-col gap-4">
            <section className="bg-white border border-zinc-200 p-5">
              <h3 className="text-sm font-bold tracking-tight text-zinc-900 mb-3">Fusion · Confidence</h3>
              <div className="grid grid-cols-2 gap-4 items-center">
                <div>
                  <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Fusion</div>
                  <div className="font-mono text-4xl font-bold tabular-nums text-zinc-900 mt-1" data-testid="replay-fusion">
                    {((fusion.score || 0) * 100).toFixed(0)}<span className="text-base text-zinc-400">%</span>
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ backgroundColor: `${modeColor}18`, color: modeColor }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: modeColor }} />
                    {MODE_META[mode]?.label}
                  </div>
                </div>
                <ConfidenceGauge value={confidence.value || 0} level={confidence.level} />
              </div>
            </section>
            <section className="bg-white border border-zinc-200 p-5">
              <h3 className="text-sm font-bold tracking-tight text-zinc-900 mb-3">Bubbles Core</h3>
              <BubblesCore frame={frame} />
            </section>
          </div>

          <div className="lg:col-span-12">
            <div className="mb-2 px-1 text-xs font-bold tracking-tight text-zinc-900">Models · gewichtete Scores</div>
            <ModelScorePanels models={frame?.models} />
          </div>
        </>
      )}
    </div>
  );
}
