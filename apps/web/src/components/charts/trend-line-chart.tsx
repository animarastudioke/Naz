"use client";

import { useMemo, useState } from "react";

interface Point {
  label: string;
  value: number;
}

/** Single-series trend line: thin 2px stroke, rounded end, hairline gridlines, hover crosshair + tooltip. */
export function TrendLineChart({ data, currency }: { data: Point[]; currency: string }) {
  const width = 640;
  const height = 220;
  const padding = { top: 16, right: 16, bottom: 28, left: 16 };
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { path, points, maxValue } = useMemo(() => {
    if (data.length === 0) return { path: "", points: [] as { x: number; y: number }[], maxValue: 0 };
    const max = Math.max(...data.map((d) => d.value), 1);
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const step = data.length > 1 ? innerWidth / (data.length - 1) : 0;

    const pts = data.map((d, i) => ({
      x: padding.left + step * i,
      y: padding.top + innerHeight * (1 - d.value / max),
    }));

    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    return { path: d, points: pts, maxValue: max };
  }, [data]);

  if (data.length === 0) {
    return <div className="flex h-[220px] items-center justify-center text-sm text-ink-muted">No data yet</div>;
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 220 }}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + (height - padding.top - padding.bottom) * (1 - f)}
            y2={padding.top + (height - padding.top - padding.bottom) * (1 - f)}
            stroke="#e1e0d9"
            strokeWidth={1}
          />
        ))}
        <path d={path} fill="none" stroke="#2a78d6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <rect
              x={p.x - (width / data.length) / 2}
              y={0}
              width={width / data.length}
              height={height}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex((cur) => (cur === i ? null : cur))}
            />
            {hoverIndex === i && (
              <>
                <line x1={p.x} x2={p.x} y1={padding.top} y2={height - padding.bottom} stroke="#c3c2b7" strokeWidth={1} />
                <circle cx={p.x} cy={p.y} r={4} fill="#2a78d6" stroke="#fcfcfb" strokeWidth={2} />
              </>
            )}
          </g>
        ))}
        {data.map((d, i) => {
          const step = data.length > 1 ? (width - padding.left - padding.right) / (data.length - 1) : 0;
          return (
            <text key={i} x={padding.left + step * i} y={height - 8} textAnchor="middle" fontSize={10} fill="#898781">
              {d.label}
            </text>
          );
        })}
      </svg>
      {hoverIndex !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md border border-line-hairline bg-surface px-2 py-1 text-xs shadow-sm dark:bg-[#161615] dark:border-white/10"
          style={{
            left: `${(points[hoverIndex].x / width) * 100}%`,
            top: `${(points[hoverIndex].y / height) * 100}%`,
          }}
        >
          <div className="font-medium text-ink dark:text-white">
            {currency} {data[hoverIndex].value.toLocaleString()}
          </div>
          <div className="text-ink-muted">{data[hoverIndex].label}</div>
        </div>
      )}
    </div>
  );
}
