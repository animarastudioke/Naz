import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { InvoicesService } from "../invoices/invoices.service";
import { NotificationsService } from "../notifications/notifications.service";
import { WhatsappService } from "../whatsapp/whatsapp.service";

/**
 * Drives KaziHQ's automation workflows: overdue invoice reminders, recurring
 * invoice generation, and 24h WhatsApp booking reminders. All jobs are
 * idempotent (they check timestamps/flags before acting) so re-running a
 * tick never double-sends.
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoicesService: InvoicesService,
    private readonly notifications: NotificationsService,
    private readonly whatsapp: WhatsappService
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleOverdueInvoices() {
    const overdue = await this.invoicesService.findOverdueInvoices();
    for (const invoice of overdue) {
      if (invoice.status !== "OVERDUE") {
        await this.invoicesService.markOverdue(invoice.id);
      }
      const hoursSinceLastReminder = invoice.lastReminderSentAt
        ? (Date.now() - invoice.lastReminderSentAt.getTime()) / (1000 * 60 * 60)
        : Infinity;
      if (hoursSinceLastReminder < 72) continue;

      if (invoice.client.email) {
        await this.notifications.sendOverdueReminderEmail(invoice.client.email, invoice.number, invoice.publicToken);
      }
      const phone = invoice.client.whatsappNumber || invoice.client.phone;
      await this.whatsapp.sendTextMessage(
        invoice.businessId,
        phone,
        `Reminder: invoice ${invoice.number} is overdue. Pay here: ${process.env.WEB_APP_URL}/i/${invoice.publicToken}`,
        "Invoice",
        invoice.id
      );
      await this.invoicesService.recordReminderSent(invoice.id);
    }
    if (overdue.length) this.logger.log(`Processed ${overdue.length} overdue invoice(s)`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async handleRecurringInvoices() {
    const due = await this.invoicesService.findDueRecurringInvoices();
    for (const invoice of due) {
      await this.invoicesService.generateNextRecurrence(invoice.id);
    }
    if (due.length) this.logger.log(`Generated ${due.length} recurring invoice(s)`);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleBookingReminders() {
    const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const in25h = new Date(Date.now() + 25 * 60 * 60 * 1000);

    const upcoming = await this.prisma.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "PENDING"] },
        startAt: { gte: in24h, lt: in25h },
        reminderSentAt: null,
      },
      include: { client: true, service: true },
    });

    for (const booking of upcoming) {
      const phone = booking.client.whatsappNumber || booking.client.phone;
      await this.whatsapp.sendBookingReminder(booking.businessId, phone, booking.service.name, booking.startAt, booking.publicToken);
      await this.prisma.booking.update({ where: { id: booking.id }, data: { reminderSentAt: new Date() } });
    }
    if (upcoming.length) this.logger.log(`Sent ${upcoming.length} booking reminder(s)`);
  }
}
