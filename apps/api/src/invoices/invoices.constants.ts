export enum RecurringInterval {
  NONE = "NONE",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  QUARTERLY = "QUARTERLY",
  ANNUALLY = "ANNUALLY",
}

export function computeNextRecurrenceDate(from: Date, interval: RecurringInterval): Date | null {
  const next = new Date(from);
  switch (interval) {
    case RecurringInterval.WEEKLY:
      next.setDate(next.getDate() + 7);
      return next;
    case RecurringInterval.MONTHLY:
      next.setMonth(next.getMonth() + 1);
      return next;
    case RecurringInterval.QUARTERLY:
      next.setMonth(next.getMonth() + 3);
      return next;
    case RecurringInterval.ANNUALLY:
      next.setFullYear(next.getFullYear() + 1);
      return next;
    default:
      return null;
  }
}
