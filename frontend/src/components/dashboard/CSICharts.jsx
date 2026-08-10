import { AreaChart, Area, LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip } from "recharts";

export const CSICharts = ({ frame, history }) => {
  const amp = (frame?.raw?.signal?.csi_amplitude || []).map((v, i) => ({ i, amp: v }));
  const sig = (history || []).map((f, i) => ({
    i,
    rssi: f.raw?.signal?.rssi,
    snr: f.raw?.signal?.snr,
  }));

  return (
    <div data-testid="csi-charts" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-mono text-zinc-500">CSI AMPLITUDE / 30 SUBTRÄGER</span>
          <span className="font-mono text-[11px] tabular-nums text-zinc-800">
            μ {frame?.raw?.signal?.csi_amp_mean ?? "—"}
          </span>
        </div>
        <div className="h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={amp} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
              <defs>
                <linearGradient id="ampGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis tick={{ fontSize: 9, fill: "#a1a1aa" }} axisLine={false} tickLine={false} width={40} />
              <XAxis dataKey="i" hide />
              <Tooltip contentStyle={{ fontSize: 11, fontFamily: "monospace", borderRadius: 6 }} />
              <Area type="monotone" dataKey="amp" stroke="#10b981" strokeWidth={1.5} fill="url(#ampGrad)" dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-mono text-zinc-500">RSSI / SNR VERLAUF</span>
          <span className="font-mono text-[11px] tabular-nums text-zinc-800">
            {frame?.raw?.signal?.rssi ?? "—"} dBm
          </span>
        </div>
        <div className="h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sig} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
              <YAxis tick={{ fontSize: 9, fill: "#a1a1aa" }} axisLine={false} tickLine={false} width={40} domain={["auto", "auto"]} />
              <XAxis dataKey="i" hide />
              <Tooltip contentStyle={{ fontSize: 11, fontFamily: "monospace", borderRadius: 6 }} />
              <Line type="monotone" dataKey="rssi" stroke="#2563eb" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="snr" stroke="#f59e0b" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
