import { Download } from "lucide-react";

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function toCSV(frames) {
  const header = [
    "seq", "timestamp", "mode", "band", "fusion_score", "fusion_state",
    "confidence", "conf_level", "presence", "motion", "signal", "stability",
    "rssi", "snr", "entities",
  ];
  const rows = frames.map((f) => [
    f.seq,
    f.timestamp,
    f.mode,
    f.raw?.signal?.band,
    f.fusion?.score,
    f.fusion?.state,
    f.confidence?.value,
    f.confidence?.level,
    f.models?.presence?.score,
    f.models?.motion?.score,
    f.models?.signal?.score,
    f.models?.stability?.score,
    f.raw?.signal?.rssi,
    f.raw?.signal?.snr,
    f.entities?.length ?? 0,
  ].join(","));
  return [header.join(","), ...rows].join("\n");
}

export const ExportButtons = ({ history, label = "Export" }) => {
  const disabled = !history || history.length === 0;
  const ts = new Date().toISOString().replace(/[:.]/g, "-");

  const exportJSON = () =>
    downloadFile(JSON.stringify(history, null, 2), `telemetry_${ts}.json`, "application/json");
  const exportCSV = () =>
    downloadFile(toCSV(history), `telemetry_${ts}.csv`, "text/csv");

  return (
    <div className="flex items-center gap-1.5">
      <button
        data-testid="export-csv-btn"
        onClick={exportCSV}
        disabled={disabled}
        className="flex items-center gap-1 rounded border border-zinc-200 px-2 py-1 font-mono text-[11px] text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
      >
        <Download className="h-3 w-3" /> CSV
      </button>
      <button
        data-testid="export-json-btn"
        onClick={exportJSON}
        disabled={disabled}
        className="flex items-center gap-1 rounded border border-zinc-200 px-2 py-1 font-mono text-[11px] text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
      >
        <Download className="h-3 w-3" /> JSON
      </button>
    </div>
  );
};
