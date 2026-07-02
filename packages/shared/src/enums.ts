// Modeled as `const object + string union type` (not TS `enum`) so these values are
// structurally assignable to Prisma's generated enum types, which Prisma itself emits
// as string-literal unions rather than nominal TS enums.

export const StaffRole = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  STAFF: "STAFF",
  VENDOR: "VENDOR",
} as const;
export type StaffRole = (typeof StaffRole)[keyof typeof StaffRole];

export const Permission = {
  MANAGE_BUSINESS: "MANAGE_BUSINESS",
  MANAGE_TEAM: "MANAGE_TEAM",
  MANAGE_CLIENTS: "MANAGE_CLIENTS",
  MANAGE_BOOKINGS: "MANAGE_BOOKINGS",
  MANAGE_QUOTATIONS: "MANAGE_QUOTATIONS",
  MANAGE_INVOICES: "MANAGE_INVOICES",
  MANAGE_PAYMENTS: "MANAGE_PAYMENTS",
  MANAGE_EXPENSES: "MANAGE_EXPENSES",
  VIEW_ANALYTICS: "VIEW_ANALYTICS",
  MANAGE_SETTINGS: "MANAGE_SETTINGS",
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];

export const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  [StaffRole.OWNER]: Object.values(Permission),
  [StaffRole.ADMIN]: Object.values(Permission),
  [StaffRole.MANAGER]: [
    Permission.MANAGE_CLIENTS,
    Permission.MANAGE_BOOKINGS,
    Permission.MANAGE_QUOTATIONS,
    Permission.MANAGE_INVOICES,
    Permission.MANAGE_PAYMENTS,
    Permission.MANAGE_EXPENSES,
    Permission.VIEW_ANALYTICS,
  ],
  [StaffRole.STAFF]: [
    Permission.MANAGE_CLIENTS,
    Permission.MANAGE_BOOKINGS,
    Permission.MANAGE_QUOTATIONS,
  ],
  [StaffRole.VENDOR]: [],
};

export const BookingStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  RESCHEDULED: "RESCHEDULED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
  NO_SHOW: "NO_SHOW",
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const QuotationStatus = {
  DRAFT: "DRAFT",
  SENT: "SENT",
  VIEWED: "VIEWED",
  APPROVED: "APPROVED",
  DECLINED: "DECLINED",
  EXPIRED: "EXPIRED",
  CONVERTED: "CONVERTED",
} as const;
export type QuotationStatus = (typeof QuotationStatus)[keyof typeof QuotationStatus];

export const InvoiceStatus = {
  DRAFT: "DRAFT",
  SENT: "SENT",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  PAID: "PAID",
  OVERDUE: "OVERDUE",
  VOID: "VOID",
  REFUNDED: "REFUNDED",
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export const PaymentMethod = {
  MPESA_STK: "MPESA_STK",
  CARD_STRIPE: "CARD_STRIPE",
  BANK_TRANSFER: "BANK_TRANSFER",
  CASH: "CASH",
  PAYMENT_LINK: "PAYMENT_LINK",
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentStatus = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const CommunicationChannel = {
  EMAIL: "EMAIL",
  SMS: "SMS",
  WHATSAPP: "WHATSAPP",
  CALL: "CALL",
  NOTE: "NOTE",
} as const;
export type CommunicationChannel = (typeof CommunicationChannel)[keyof typeof CommunicationChannel];

export const ExpenseCategory = {
  SUPPLIES: "SUPPLIES",
  TRAVEL: "TRAVEL",
  MARKETING: "MARKETING",
  SOFTWARE: "SOFTWARE",
  VENDOR_PAYOUT: "VENDOR_PAYOUT",
  UTILITIES: "UTILITIES",
  RENT: "RENT",
  OTHER: "OTHER",
} as const;
export type ExpenseCategory = (typeof ExpenseCategory)[keyof typeof ExpenseCategory];

export const PayoutStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  PAID: "PAID",
  REJECTED: "REJECTED",
} as const;
export type PayoutStatus = (typeof PayoutStatus)[keyof typeof PayoutStatus];

export const DEFAULT_KENYA_VAT_RATE = 16;
export const DEFAULT_CURRENCY = "KES";
