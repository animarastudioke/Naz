interface BarDatum {
  label: string;
  value: number;
}

/** Horizontal magnitude bars, single hue, rounded data-ends, direct value labels — no legend needed for one series. */
export function RankedBarChart({ data, currency }: { data: BarDatum[]; currency: string }) {
  if (data.length === 0) {
    return <div className="flex h-[160px] items-center justify-center text-sm text-ink-muted">No data yet</div>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-ink dark:text-white">{d.label}</span>
            <span className="tabular-nums text-ink-muted">
              {currency} {d.value.toLocaleString()}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-line-hairline dark:bg-white/10">
            <div
              className="h-full rounded-full bg-brand-500"
              style={{ width: `${Math.max(4, (d.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
