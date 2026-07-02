export interface LineItemInput {
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discountPercent?: number;
}

export interface LineItemTotals {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
}

/** Rounds to 2dp using half-up rounding to avoid floating point drift in money math. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateLineItem(item: LineItemInput): LineItemTotals {
  const subtotal = round2(item.quantity * item.unitPrice);
  const discountAmount = round2(subtotal * ((item.discountPercent ?? 0) / 100));
  const taxableAmount = round2(subtotal - discountAmount);
  const taxAmount = round2(taxableAmount * ((item.taxRate ?? 0) / 100));
  const total = round2(taxableAmount + taxAmount);
  return { subtotal, discountAmount, taxableAmount, taxAmount, total };
}

export interface DocumentTotals {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  depositAmount: number;
  balanceDue: number;
}

export function calculateDocumentTotals(
  items: LineItemInput[],
  opts: { depositPercent?: number; depositFixed?: number } = {}
): DocumentTotals {
  const totals = items.reduce(
    (acc, item) => {
      const t = calculateLineItem(item);
      acc.subtotal = round2(acc.subtotal + t.subtotal);
      acc.discountAmount = round2(acc.discountAmount + t.discountAmount);
      acc.taxAmount = round2(acc.taxAmount + t.taxAmount);
      acc.total = round2(acc.total + t.total);
      return acc;
    },
    { subtotal: 0, discountAmount: 0, taxAmount: 0, total: 0 }
  );

  const depositAmount = opts.depositFixed
    ? round2(opts.depositFixed)
    : opts.depositPercent
      ? round2(totals.total * (opts.depositPercent / 100))
      : 0;

  return {
    ...totals,
    depositAmount,
    balanceDue: round2(totals.total - depositAmount),
  };
}

/** Kenya Revenue Authority style invoice numbering: INV-YYYY-000123 */
export function formatDocumentNumber(prefix: string, year: number, sequence: number): string {
  return `${prefix}-${year}-${String(sequence).padStart(6, "0")}`;
}
