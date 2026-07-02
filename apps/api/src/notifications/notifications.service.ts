import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter | null {
    if (!process.env.SMTP_HOST) return null;
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
      });
    }
    return this.transporter;
  }

  private async send(to: string, subject: string, html: string) {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.log(`[email:dry-run] to=${to} subject="${subject}"`);
      return;
    }
    await transporter.sendMail({ from: process.env.SMTP_FROM ?? "KaziHQ <no-reply@kazihq.app>", to, subject, html });
  }

  async sendTeamInviteEmail(email: string, businessName: string, inviteToken: string) {
    const link = `${process.env.WEB_APP_URL}/accept-invite?token=${inviteToken}`;
    await this.send(
      email,
      `You've been invited to join ${businessName} on KaziHQ`,
      `<p>You've been invited to join <strong>${businessName}</strong> on KaziHQ.</p><p><a href="${link}">Accept invitation</a></p>`
    );
  }

  async sendQuotationEmail(email: string, quotationNumber: string, publicToken: string) {
    const link = `${process.env.WEB_APP_URL}/q/${publicToken}`;
    await this.send(
      email,
      `Quotation ${quotationNumber}`,
      `<p>Please review and approve your quotation.</p><p><a href="${link}">View quotation ${quotationNumber}</a></p>`
    );
  }

  async sendInvoiceEmail(email: string, invoiceNumber: string, publicToken: string) {
    const link = `${process.env.WEB_APP_URL}/i/${publicToken}`;
    await this.send(
      email,
      `Invoice ${invoiceNumber}`,
      `<p>Your invoice is ready.</p><p><a href="${link}">View invoice ${invoiceNumber}</a></p>`
    );
  }

  async sendOverdueReminderEmail(email: string, invoiceNumber: string, publicToken: string) {
    const link = `${process.env.WEB_APP_URL}/i/${publicToken}`;
    await this.send(
      email,
      `Reminder: Invoice ${invoiceNumber} is overdue`,
      `<p>This is a friendly reminder that invoice ${invoiceNumber} is overdue.</p><p><a href="${link}">Pay now</a></p>`
    );
  }
}
