import { cup, compact } from "../lib/format";

export function BarChart({ data, height = 160 }: { data: Array<{ label: string; value: number }>; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-[10px] font-semibold text-slate-500">{compact(d.value)}</span>
          <div
            className="w-full rounded-t-lg bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all"
            style={{ height: `${(d.value / max) * (height - 36)}px`, minHeight: d.value > 0 ? 4 : 0 }}
            title={cup(d.value)}
          />
          <span className="text-[10px] font-medium text-slate-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function DualBarChart({
  data,
  height = 180,
}: {
  data: Array<{ label: string; a: number; b: number }>;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.a, d.b)));
  return (
    <div className="flex items-end gap-3" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
          <div className="flex w-full items-end justify-center gap-1" style={{ height: height - 24 }}>
            <div className="w-1/2 rounded-t-md bg-emerald-500" style={{ height: `${(d.a / max) * (height - 28)}px` }} title={`Ingresos ${cup(d.a)}`} />
            <div className="w-1/2 rounded-t-md bg-rose-400" style={{ height: `${(d.b / max) * (height - 28)}px` }} title={`Gastos ${cup(d.b)}`} />
          </div>
          <span className="text-[10px] font-medium text-slate-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({ segments, size = 150 }: { segments: Array<{ label: string; value: number; color: string }>; size?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const radius = size / 2 - 12;
  const circ = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {segments.map((seg, i) => {
          const len = (seg.value / total) * circ;
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={20}
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="space-y-1.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="h-3 w-3 rounded-sm" style={{ background: seg.color }} />
            <span className="text-slate-600">{seg.label}</span>
            <span className="ml-auto font-semibold text-slate-900">{cup(seg.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
