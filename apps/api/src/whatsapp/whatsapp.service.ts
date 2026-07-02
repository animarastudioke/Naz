import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Thin wrapper around the Meta WhatsApp Cloud API, scoped per-business using
 * credentials stored in BusinessIntegration. Every outbound/inbound message is
 * persisted to WhatsAppMessage so it feeds the CRM communication timeline.
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async getCredentials(businessId: string) {
    const integration = await this.prisma.businessIntegration.findUnique({ where: { businessId } });
    if (!integration?.whatsappPhoneNumberId || !integration?.whatsappAccessToken) return null;
    return {
      phoneNumberId: integration.whatsappPhoneNumberId,
      accessToken: integration.whatsappAccessToken,
    };
  }

  async sendTextMessage(
    businessId: string,
    toPhone: string,
    message: string,
    relatedEntityType?: string,
    relatedEntityId?: string
  ) {
    const creds = await this.getCredentials(businessId);
    const apiVersion = process.env.WHATSAPP_API_VERSION ?? "v20.0";

    let waMessageId: string | undefined;
    let status = "dry-run";

    if (creds) {
      try {
        const response = await axios.post(
          `https://graph.facebook.com/${apiVersion}/${creds.phoneNumberId}/messages`,
          {
            messaging_product: "whatsapp",
            to: toPhone,
            type: "text",
            text: { body: message },
          },
          { headers: { Authorization: `Bearer ${creds.accessToken}` } }
        );
        waMessageId = response.data?.messages?.[0]?.id;
        status = "sent";
      } catch (error) {
        this.logger.error(`Failed to send WhatsApp message to ${toPhone}`, error as Error);
        status = "failed";
      }
    } else {
      this.logger.log(`[whatsapp:dry-run] to=${toPhone} message="${message}"`);
    }

    await this.prisma.whatsAppMessage.create({
      data: {
        businessId,
        clientPhone: toPhone,
        direction: "OUTBOUND",
        messageType: "text",
        content: message,
        waMessageId,
        status,
        relatedEntityType,
        relatedEntityId,
      },
    });

    return { status, waMessageId };
  }

  async sendQuotationApprovalLink(businessId: string, clientPhone: string, quotationNumber: string, publicToken: string) {
    const link = `${process.env.WEB_APP_URL}/q/${publicToken}`;
    const message = `Hi! Your quotation ${quotationNumber} is ready. Please review and approve here: ${link}`;
    return this.sendTextMessage(businessId, clientPhone, message, "Quotation", publicToken);
  }

  async sendInvoiceLink(businessId: string, clientPhone: string, invoiceNumber: string, publicToken: string) {
    const link = `${process.env.WEB_APP_URL}/i/${publicToken}`;
    const message = `Hi! Your invoice ${invoiceNumber} is ready. View and pay here: ${link}`;
    return this.sendTextMessage(businessId, clientPhone, message, "Invoice", publicToken);
  }

  async sendBookingReminder(businessId: string, clientPhone: string, serviceName: string, startAt: Date, publicToken: string) {
    const link = `${process.env.WEB_APP_URL}/b/${publicToken}`;
    const when = startAt.toLocaleString("en-KE", { timeZone: "Africa/Nairobi" });
    const message = `Reminder: your ${serviceName} appointment is on ${when}. Manage your booking: ${link}`;
    return this.sendTextMessage(businessId, clientPhone, message, "Booking", publicToken);
  }

  async logInboundMessage(businessId: string, fromPhone: string, message: string, waMessageId?: string) {
    return this.prisma.whatsAppMessage.create({
      data: {
        businessId,
        clientPhone: fromPhone,
        direction: "INBOUND",
        messageType: "text",
        content: message,
        waMessageId,
        status: "received",
      },
    });
  }

  async getConversation(businessId: string, clientPhone: string) {
    return this.prisma.whatsAppMessage.findMany({
      where: { businessId, clientPhone },
      orderBy: { createdAt: "asc" },
    });
  }
}
