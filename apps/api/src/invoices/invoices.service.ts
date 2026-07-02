import { Injectable, NotFoundException } from "@nestjs/common";
import { calculateDocumentTotals, calculateLineItem, InvoiceStatus } from "@kazihq/shared";
import { PrismaService } from "../prisma/prisma.service";
import { DocumentNumberingService } from "../common/services/document-numbering.service";
import { NotificationsService } from "../notifications/notifications.service";
import { WhatsappService } from "../whatsapp/whatsapp.service";
import { CreateInvoiceDto, CreateCreditNoteDto } from "./dto/invoice.dto";
import { computeNextRecurrenceDate, RecurringInterval } from "./invoices.constants";
import { InvoicePdfService } from "./invoice-pdf.service";

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbering: DocumentNumberingService,
    private readonly notifications: NotificationsService,
    private readonly whatsapp: WhatsappService,
    private readonly pdf: InvoicePdfService
  ) {}

  async list(businessId: string, status?: string) {
    return this.prisma.invoice.findMany({
      where: { businessId, status: status ? (status as InvoiceStatus) : undefined },
      include: { client: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(businessId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, businessId },
      include: { client: true, items: { orderBy: { sortOrder: "asc" } }, payments: true, creditNotes: true },
    });
    if (!invoice) throw new NotFoundException("Invoice not found");
    return invoice;
  }

  async create(businessId: string, dto: CreateInvoiceDto) {
    const business = await this.prisma.business.findUniqueOrThrow({ where: { id: businessId } });
    const totals = calculateDocumentTotals(dto.items);
    const number = await this.numbering.next(businessId, "INVOICE", business.invoicePrefix);
    const recurringInterval = dto.recurringInterval ?? RecurringInterval.NONE;

    return this.prisma.invoice.create({
      data: {
        businessId,
        clientId: dto.clientId,
        bookingId: dto.bookingId,
        number,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        total: totals.total,
        balanceDue: totals.total,
        currency: business.currency,
        dueDate: new Date(dto.dueDate),
        recurringInterval: recurringInterval as any,
        nextRecurrenceDate: computeNextRecurrenceDate(new Date(dto.dueDate), recurringInterval),
        notes: dto.notes,
        items: {
          create: dto.items.map((item, index) => ({
            serviceId: item.serviceId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate ?? business.vatRate,
            discountPercent: item.discountPercent ?? 0,
            lineTotal: calculateLineItem({
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              discountPercent: item.discountPercent,
            }).total,
            sortOrder: index,
          })),
        },
      },
      include: { items: true, client: true },
    });
  }

  async send(businessId: string, id: string, channel: "email" | "whatsapp" | "both" = "both") {
    const invoice = await this.get(businessId, id);
    const updated = await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: InvoiceStatus.SENT, sentAt: new Date() },
    });

    if ((channel === "email" || channel === "both") && invoice.client.email) {
      await this.notifications.sendInvoiceEmail(invoice.client.email, invoice.number, invoice.publicToken);
    }
    if (channel === "whatsapp" || channel === "both") {
      const phone = invoice.client.whatsappNumber || invoice.client.phone;
      await this.whatsapp.sendInvoiceLink(businessId, phone, invoice.number, invoice.publicToken);
    }
    return updated;
  }

  async getPublicByToken(token: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { publicToken: token },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        client: { select: { fullName: true, email: true, phone: true } },
        business: { select: { name: true, logoUrl: true, brandColor: true, currency: true, kraPin: true } },
        payments: { where: { status: "SUCCESS" } },
      },
    });
    if (!invoice) throw new NotFoundException("Invoice not found");
    return invoice;
  }

  /** Applies a successful payment: increments amountPaid, recomputes balanceDue/status. Called by PaymentsService. */
  async applyPayment(invoiceId: string, amount: number) {
    const invoice = await this.prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    const amountPaid = Number(invoice.amountPaid) + amount;
    const balanceDue = Math.max(0, Number(invoice.total) - amountPaid);
    const status = balanceDue <= 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { amountPaid, balanceDue, status, paidAt: balanceDue <= 0 ? new Date() : undefined },
    });
  }

  async issueCreditNote(businessId: string, invoiceId: string, dto: CreateCreditNoteDto) {
    const invoice = await this.get(businessId, invoiceId);
    const business = await this.prisma.business.findUniqueOrThrow({ where: { id: businessId } });
    const number = await this.numbering.next(businessId, "INVOICE", `CN-${business.invoicePrefix}`);

    const balanceDue = Math.max(0, Number(invoice.balanceDue) - dto.amount);

    return this.prisma.$transaction(async (tx) => {
      const creditNote = await tx.creditNote.create({
        data: { invoiceId, number, amount: dto.amount, reason: dto.reason },
      });
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { balanceDue, status: balanceDue <= 0 ? InvoiceStatus.PAID : invoice.status },
      });
      return creditNote;
    });
  }

  async voidInvoice(businessId: string, invoiceId: string) {
    await this.get(businessId, invoiceId);
    return this.prisma.invoice.update({ where: { id: invoiceId }, data: { status: InvoiceStatus.VOID } });
  }

  async generatePdf(businessId: string, id: string): Promise<Buffer> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, businessId },
      include: { items: { orderBy: { sortOrder: "asc" } }, client: true, business: true },
    });
    if (!invoice) throw new NotFoundException("Invoice not found");

    return this.pdf.generate({
      business: invoice.business,
      client: invoice.client,
      number: invoice.number,
      dueDate: invoice.dueDate,
      items: invoice.items,
      subtotal: invoice.subtotal,
      discountAmount: invoice.discountAmount,
      taxAmount: invoice.taxAmount,
      total: invoice.total,
      amountPaid: invoice.amountPaid,
      balanceDue: invoice.balanceDue,
      notes: invoice.notes,
    });
  }

  /** Scans for invoices past due and not fully paid; used by the automation scheduler. */
  async findOverdueInvoices() {
    return this.prisma.invoice.findMany({
      where: {
        dueDate: { lt: new Date() },
        status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID] },
      },
      include: { client: true },
    });
  }

  async markOverdue(invoiceId: string) {
    return this.prisma.invoice.update({ where: { id: invoiceId }, data: { status: InvoiceStatus.OVERDUE } });
  }

  async recordReminderSent(invoiceId: string) {
    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { overdueReminderCount: { increment: 1 }, lastReminderSentAt: new Date() },
    });
  }

  async findDueRecurringInvoices() {
    return this.prisma.invoice.findMany({
      where: {
        recurringInterval: { not: "NONE" as any },
        nextRecurrenceDate: { lte: new Date() },
      },
      include: { items: true },
    });
  }

  async generateNextRecurrence(invoiceId: string) {
    const source = await this.prisma.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: { items: true },
    });
    const business = await this.prisma.business.findUniqueOrThrow({ where: { id: source.businessId } });
    const number = await this.numbering.next(source.businessId, "INVOICE", business.invoicePrefix);
    const newDueDate = computeNextRecurrenceDate(source.dueDate, source.recurringInterval as RecurringInterval)!;

    const created = await this.prisma.invoice.create({
      data: {
        businessId: source.businessId,
        clientId: source.clientId,
        number,
        subtotal: source.subtotal,
        discountAmount: source.discountAmount,
        taxAmount: source.taxAmount,
        total: source.total,
        balanceDue: source.total,
        currency: source.currency,
        dueDate: newDueDate,
        recurringInterval: source.recurringInterval,
        nextRecurrenceDate: computeNextRecurrenceDate(newDueDate, source.recurringInterval as RecurringInterval),
        parentInvoiceId: source.id,
        items: {
          create: source.items.map((item) => ({
            serviceId: item.serviceId ?? undefined,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            discountPercent: item.discountPercent,
            lineTotal: item.lineTotal,
            sortOrder: item.sortOrder,
          })),
        },
      },
    });

    await this.prisma.invoice.update({
      where: { id: source.id },
      data: { nextRecurrenceDate: null },
    });

    return created;
  }
}
