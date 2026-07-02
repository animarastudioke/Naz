import clsx from "clsx";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-ink-muted/10 text-ink-secondary",
  SENT: "bg-brand-50 text-brand-700",
  VIEWED: "bg-brand-50 text-brand-700",
  PENDING: "bg-status-warning/15 text-[#7a5400]",
  CONFIRMED: "bg-status-good/10 text-status-good",
  APPROVED: "bg-status-good/10 text-status-good",
  PAID: "bg-status-good/10 text-status-good",
  SUCCESS: "bg-status-good/10 text-status-good",
  COMPLETED: "bg-status-good/10 text-status-good",
  PARTIALLY_PAID: "bg-status-warning/15 text-[#7a5400]",
  OVERDUE: "bg-status-critical/10 text-status-critical",
  DECLINED: "bg-status-critical/10 text-status-critical",
  CANCELLED: "bg-status-critical/10 text-status-critical",
  FAILED: "bg-status-critical/10 text-status-critical",
  VOID: "bg-ink-muted/10 text-ink-secondary",
  EXPIRED: "bg-ink-muted/10 text-ink-secondary",
  NO_SHOW: "bg-status-serious/10 text-status-serious",
  RESCHEDULED: "bg-status-warning/15 text-[#7a5400]",
  CONVERTED: "bg-brand-50 text-brand-700",
};

export function Badge({ status, children }: { status?: string; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        (status && STATUS_STYLES[status]) ?? "bg-ink-muted/10 text-ink-secondary"
      )}
    >
      {children}
    </span>
  );
}
