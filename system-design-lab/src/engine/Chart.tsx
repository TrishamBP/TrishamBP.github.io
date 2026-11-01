/** Minimal multi-series line chart (SVG). Each series gets its own y-scale
 *  so latency (ms) and error rate (%) can share one strip. */
export interface Series { name: string; color: string; values: number[]; unit: string; max?: number }

export function LineChart({ series, height = 120, label }: { series: Series[]; height?: number; label: string }) {
  const W = 600, H = height, pad = 6;
  const n = Math.max(2, ...series.map((s) => s.values.length));
  return (
    <figure className="rounded-lg border border-lab-line bg-lab-bg p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={label}>
        {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} stroke="#1e293b" />)}
        {series.map((s) => {
          const max = s.max ?? Math.max(1e-9, ...s.values) * 1.15;
          const pts = s.values.map((v, i) => `${(i / (n - 1)) * W},${H - pad - (Math.min(v, max) / max) * (H - 2 * pad)}`).join(" ");
          return <polyline key={s.name} points={pts} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" />;
        })}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-4 text-[11px] text-lab-muted">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3" style={{ background: s.color }} />
            {s.name}: <b className="font-mono text-slate-200">{fmt(s.values[s.values.length - 1] ?? 0)}{s.unit}</b>
          </span>
        ))}
        <span className="ml-auto">last {n} samples · each line on its own scale</span>
      </figcaption>
    </figure>
  );
}

export const fmt = (v: number) =>
  !isFinite(v) ? "∞" : v >= 10000 ? `${(v / 1000).toFixed(0)}k` : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2);
