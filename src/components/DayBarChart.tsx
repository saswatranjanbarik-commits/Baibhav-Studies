/**
 * DayBarChart — simple vertical bar chart (one series, one colour), with a
 * hover/tap tooltip on every bar. Used for "study time per day".
 * Plain HTML/CSS — no chart library needed.
 */
import React, { useState } from 'react';

export interface BarDatum { key: string; label: string; value: number; tooltip: string }

interface Props {
  data: BarDatum[];
  /** Formats axis values, e.g. minutes → "2 h". */
  formatValue: (v: number) => string;
  height?: number;
}

export default function DayBarChart({ data, formatValue, height = 160 }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 0);
  // A round-ish top for the axis so gridlines are meaningful.
  const top = max <= 0 ? 60 : Math.ceil(max / 30) * 30;

  return (
    <div className="w-full select-none" role="img" aria-label={data.map((d) => `${d.label}: ${formatValue(d.value)}`).join(', ')}>
      <div className="relative" style={{ height }}>
        {/* Recessive gridlines at 50% and 100% */}
        {[0.5, 1].map((f) => (
          <div key={f} className="absolute left-0 right-0 border-t border-dashed border-slate-200" style={{ bottom: `${f * 100}%` }}>
            <span className="absolute -top-2.5 left-0 text-[10px] text-slate-400 bg-white pr-1">{formatValue(top * f)}</span>
          </div>
        ))}
        {/* Bars */}
        <div className="absolute inset-0 flex items-end gap-1 pl-10">
          {data.map((d, i) => {
            const pct = top ? (d.value / top) * 100 : 0;
            return (
              <div
                key={d.key}
                className="relative flex-1 h-full flex items-end justify-center cursor-default"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onClick={() => setHover(hover === i ? null : i)}
              >
                <div
                  className={`w-full max-w-[28px] rounded-t transition-colors ${hover === i ? 'bg-indigo-700' : 'bg-indigo-500'}`}
                  style={{ height: d.value > 0 ? `max(${pct}%, 3px)` : 0 }}
                />
                {hover === i && (
                  <div className="absolute z-10 bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 text-white text-xs px-2 py-1 shadow print:hidden">
                    {d.tooltip}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* Baseline */}
        <div className="absolute left-10 right-0 bottom-0 border-t border-slate-300" />
      </div>
      {/* Labels */}
      <div className="flex gap-1 pl-10 mt-1">
        {data.map((d) => (
          <div key={d.key} className="flex-1 text-center text-[11px] text-slate-500">{d.label}</div>
        ))}
      </div>
    </div>
  );
}
