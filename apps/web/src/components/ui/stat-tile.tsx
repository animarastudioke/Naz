import clsx from "clsx";
import { Card } from "./card";

export function StatTile({
  label,
  value,
  delta,
  deltaLabel,
}: {
  label: string;
  value: string;
  delta?: "up" | "down" | "neutral";
  deltaLabel?: string;
}) {
  return (
    <Card>
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-ink dark:text-white">{value}</p>
      {deltaLabel && (
        <p
          className={clsx(
            "mt-1 text-xs font-medium",
            delta === "up" && "text-status-good",
            delta === "down" && "text-status-critical",
            (!delta || delta === "neutral") && "text-ink-muted"
          )}
        >
          {deltaLabel}
        </p>
      )}
    </Card>
  );
}
