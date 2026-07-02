import { z } from "zod";

export const registerBusinessSchema = z.object({
  businessName: z.string().min(2).max(120),
  ownerName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(7).max(20),
  industry: z.string().min(1),
  country: z.string().default("KE"),
});
export type RegisterBusinessInput = z.infer<typeof registerBusinessSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const clientSchema = z.object({
  fullName: z.string().min(2).max(150),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(7).max(20),
  whatsappNumber: z.string().min(7).max(20).optional().or(z.literal("")),
  company: z.string().optional(),
  address: z.string().optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
});
export type ClientInput = z.infer<typeof clientSchema>;

export const lineItemSchema = z.object({
  serviceId: z.string().optional(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  taxRate: z.number().min(0).max(100).default(16),
  discountPercent: z.number().min(0).max(100).default(0),
});
export type LineItemDto = z.infer<typeof lineItemSchema>;

export const quotationSchema = z.object({
  clientId: z.string(),
  title: z.string().min(2),
  items: z.array(lineItemSchema).min(1),
  depositPercent: z.number().min(0).max(100).optional(),
  expiresAt: z.string().datetime().optional(),
  notes: z.string().optional(),
  templateId: z.string().optional(),
});
export type QuotationInput = z.infer<typeof quotationSchema>;

export const invoiceSchema = z.object({
  clientId: z.string(),
  quotationId: z.string().optional(),
  items: z.array(lineItemSchema).min(1),
  dueDate: z.string().datetime(),
  currency: z.string().default("KES"),
  recurringInterval: z.enum(["NONE", "WEEKLY", "MONTHLY", "QUARTERLY", "ANNUALLY"]).default("NONE"),
  notes: z.string().optional(),
});
export type InvoiceInput = z.infer<typeof invoiceSchema>;

export const bookingSchema = z.object({
  clientId: z.string(),
  serviceId: z.string(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  branchId: z.string().optional(),
  staffId: z.string().optional(),
  notes: z.string().optional(),
  depositAmount: z.number().nonnegative().optional(),
});
export type BookingInput = z.infer<typeof bookingSchema>;

export const stkPushSchema = z.object({
  invoiceId: z.string().optional(),
  bookingId: z.string().optional(),
  phoneNumber: z.string().regex(/^2547\d{8}$|^2541\d{8}$/, "Use format 2547XXXXXXXX"),
  amount: z.number().positive(),
  accountReference: z.string().max(20),
});
export type StkPushInput = z.infer<typeof stkPushSchema>;

export const whatsappQuoteAssistSchema = z.object({
  clientId: z.string().optional(),
  conversationText: z.string().min(20),
});
export type WhatsappQuoteAssistInput = z.infer<typeof whatsappQuoteAssistSchema>;
