import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { calculateDocumentTotals, calculateLineItem, QuotationStatus } from "@kazihq/shared";
import { PrismaService } from "../prisma/prisma.service";
import { DocumentNumberingService } from "../common/services/document-numbering.service";
import { NotificationsService } from "../notifications/notifications.service";
import { WhatsappService } from "../whatsapp/whatsapp.service";
import { CreateQuotationDto, ApproveQuotationDto } from "./dto/quotation.dto";

@Injectable()
export class QuotationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbering: DocumentNumberingService,
    private readonly notifications: NotificationsService,
    private readonly whatsapp: WhatsappService
  ) {}

  async list(businessId: string, status?: string) {
    return this.prisma.quotation.findMany({
      where: { businessId, status: status ? (status as QuotationStatus) : undefined },
      include: { client: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(businessId: string, id: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, businessId },
      include: { client: true, items: { orderBy: { sortOrder: "asc" } } },
    });
    if (!quotation) throw new NotFoundException("Quotation not found");
    return quotation;
  }

  async create(businessId: string, dto: CreateQuotationDto) {
    const business = await this.prisma.business.findUniqueOrThrow({ where: { id: businessId } });
    const totals = calculateDocumentTotals(dto.items, { depositPercent: dto.depositPercent });
    const number = await this.numbering.next(businessId, "QUOTATION", business.quotePrefix);

    return this.prisma.quotation.create({
      data: {
        businessId,
        clientId: dto.clientId,
        number,
        title: dto.title,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        total: totals.total,
        depositAmount: totals.depositAmount,
        currency: business.currency,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
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
    const quotation = await this.get(businessId, id);
    const updated = await this.prisma.quotation.update({
      where: { id: quotation.id },
      data: { status: QuotationStatus.SENT, sentAt: new Date() },
    });

    if ((channel === "email" || channel === "both") && quotation.client.email) {
      await this.notifications.sendQuotationEmail(quotation.client.email, quotation.number, quotation.publicToken);
    }
    if (channel === "whatsapp" || channel === "both") {
      const phone = quotation.client.whatsappNumber || quotation.client.phone;
      await this.whatsapp.sendQuotationApprovalLink(businessId, phone, quotation.number, quotation.publicToken);
    }

    return updated;
  }

  async getPublicByToken(token: string) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { publicToken: token },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        client: { select: { fullName: true, email: true, phone: true } },
        business: { select: { name: true, logoUrl: true, brandColor: true, currency: true, kraPin: true } },
      },
    });
    if (!quotation) throw new NotFoundException("Quotation not found");

    if (quotation.status === QuotationStatus.SENT) {
      await this.prisma.quotation.update({
        where: { id: quotation.id },
        data: { status: QuotationStatus.VIEWED, viewedAt: new Date() },
      });
    }
    return quotation;
  }

  async approveByToken(token: string, dto: ApproveQuotationDto, ipAddress?: string) {
    const quotation = await this.prisma.quotation.findUnique({ where: { publicToken: token } });
    if (!quotation) throw new NotFoundException("Quotation not found");
    if (quotation.expiresAt && quotation.expiresAt < new Date()) {
      await this.prisma.quotation.update({ where: { id: quotation.id }, data: { status: QuotationStatus.EXPIRED } });
      throw new BadRequestException("This quotation has expired. Please request a new one.");
    }
    if (![QuotationStatus.SENT, QuotationStatus.VIEWED].includes(quotation.status as any)) {
      throw new ForbiddenException("This quotation can no longer be approved");
    }

    return this.prisma.quotation.update({
      where: { id: quotation.id },
      data: {
        status: QuotationStatus.APPROVED,
        approvedAt: new Date(),
        signatureName: dto.signatureName,
        signatureImageUrl: dto.signatureImageUrl,
        signedIpAddress: ipAddress,
      },
    });
  }

  async declineByToken(token: string, reason?: string) {
    const quotation = await this.prisma.quotation.findUnique({ where: { publicToken: token } });
    if (!quotation) throw new NotFoundException("Quotation not found");

    return this.prisma.quotation.update({
      where: { id: quotation.id },
      data: { status: QuotationStatus.DECLINED, declinedAt: new Date(), notes: reason ?? quotation.notes },
    });
  }

  async convertToInvoice(businessId: string, id: string, dueDate: Date) {
    const quotation = await this.get(businessId, id);
    if (quotation.status !== QuotationStatus.APPROVED) {
      throw new BadRequestException("Only approved quotations can be converted to an invoice");
    }

    const existingInvoice = await this.prisma.invoice.findUnique({ where: { quotationId: id } });
    if (existingInvoice) throw new BadRequestException("This quotation was already converted to an invoice");

    const business = await this.prisma.business.findUniqueOrThrow({ where: { id: businessId } });
    const number = await this.numbering.next(businessId, "INVOICE", business.invoicePrefix);
    const balanceDue = Number(quotation.total) - Number(quotation.depositAmount ?? 0);

    const invoice = await this.prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          businessId,
          clientId: quotation.clientId,
          quotationId: quotation.id,
          number,
          subtotal: quotation.subtotal,
          discountAmount: quotation.discountAmount,
          taxAmount: quotation.taxAmount,
          total: quotation.total,
          balanceDue,
          amountPaid: quotation.depositAmount ?? 0,
          currency: quotation.currency,
          dueDate,
          items: {
            create: quotation.items.map((item) => ({
              serviceId: item.serviceId,
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
        include: { items: true },
      });

      await tx.quotation.update({ where: { id: quotation.id }, data: { status: QuotationStatus.CONVERTED } });
      return created;
    });

    return invoice;
  }
}
