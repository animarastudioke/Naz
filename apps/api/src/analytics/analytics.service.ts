import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async revenueDashboard(businessId: string, from?: string, to?: string) {
    const dateFilter = {
      gte: from ? new Date(from) : undefined,
      lte: to ? new Date(to) : undefined,
    };

    const [revenue, outstanding, expenses, payoutsDue, bookingsCount, clientsCount] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { businessId, status: "SUCCESS", paidAt: dateFilter },
        _sum: { amount: true },
      }),
      this.prisma.invoice.aggregate({
        where: { businessId, status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
        _sum: { balanceDue: true },
      }),
      this.prisma.expense.aggregate({
        where: { businessId, incurredAt: dateFilter },
        _sum: { amount: true },
      }),
      this.prisma.vendorPayout.aggregate({
        where: { businessId, status: { in: ["PENDING", "APPROVED"] } },
        _sum: { amount: true },
      }),
      this.prisma.booking.count({ where: { businessId, startAt: dateFilter } }),
      this.prisma.client.count({ where: { businessId, createdAt: dateFilter } }),
    ]);

    const totalRevenue = Number(revenue._sum.amount ?? 0);
    const totalExpenses = Number(expenses._sum.amount ?? 0);

    return {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      outstandingReceivables: Number(outstanding._sum.balanceDue ?? 0),
      vendorPayoutsDue: Number(payoutsDue._sum.amount ?? 0),
      bookingsInRange: bookingsCount,
      newClientsInRange: clientsCount,
    };
  }

  async salesTrend(businessId: string, months = 6) {
    const rows = await this.prisma.$queryRaw<{ month: Date; total: string }[]>`
      SELECT date_trunc('month', "paidAt") AS month, SUM(amount) AS total
      FROM "Payment"
      WHERE "businessId" = ${businessId}
        AND status = 'SUCCESS'
        AND "paidAt" >= (CURRENT_DATE - (${months}::int * INTERVAL '1 month'))
      GROUP BY 1
      ORDER BY 1 ASC
    `;
    return rows.map((r) => ({ month: r.month, total: Number(r.total) }));
  }

  async mostProfitableServices(businessId: string, limit = 10) {
    const rows = await this.prisma.$queryRaw<{ serviceId: string; name: string; total: string; count: string }[]>`
      SELECT s.id AS "serviceId", s.name AS name, SUM(ii."lineTotal") AS total, COUNT(*) AS count
      FROM "InvoiceItem" ii
      JOIN "Invoice" i ON i.id = ii."invoiceId"
      JOIN "Service" s ON s.id = ii."serviceId"
      WHERE i."businessId" = ${businessId}
      GROUP BY s.id, s.name
      ORDER BY total DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({ serviceId: r.serviceId, name: r.name, total: Number(r.total), invoiceCount: Number(r.count) }));
  }

  async customerAcquisition(businessId: string, months = 6) {
    const rows = await this.prisma.$queryRaw<{ month: Date; count: string }[]>`
      SELECT date_trunc('month', "createdAt") AS month, COUNT(*) AS count
      FROM "Client"
      WHERE "businessId" = ${businessId}
        AND "createdAt" >= (CURRENT_DATE - (${months}::int * INTERVAL '1 month'))
      GROUP BY 1
      ORDER BY 1 ASC
    `;
    return rows.map((r) => ({ month: r.month, newClients: Number(r.count) }));
  }

  async bookingConversionRate(businessId: string) {
    const [totalQuotations, approvedQuotations, totalBookings, completedBookings] = await Promise.all([
      this.prisma.quotation.count({ where: { businessId } }),
      this.prisma.quotation.count({ where: { businessId, status: "APPROVED" } }),
      this.prisma.booking.count({ where: { businessId } }),
      this.prisma.booking.count({ where: { businessId, status: "COMPLETED" } }),
    ]);

    return {
      quotationApprovalRate: totalQuotations ? Math.round((approvedQuotations / totalQuotations) * 1000) / 10 : 0,
      bookingCompletionRate: totalBookings ? Math.round((completedBookings / totalBookings) * 1000) / 10 : 0,
      totalQuotations,
      approvedQuotations,
      totalBookings,
      completedBookings,
    };
  }

  async monthlyReport(businessId: string, month: number, year: number) {
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 1);

    const [revenue, expenses, newClients, bookingsCount, topServices] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { businessId, status: "SUCCESS", paidAt: { gte: from, lt: to } },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { businessId, incurredAt: { gte: from, lt: to } },
        _sum: { amount: true },
      }),
      this.prisma.client.count({ where: { businessId, createdAt: { gte: from, lt: to } } }),
      this.prisma.booking.count({ where: { businessId, startAt: { gte: from, lt: to } } }),
      this.mostProfitableServices(businessId, 5),
    ]);

    return {
      period: `${year}-${String(month).padStart(2, "0")}`,
      revenue: Number(revenue._sum.amount ?? 0),
      expenses: Number(expenses._sum.amount ?? 0),
      newClients,
      bookingsCount,
      topServices,
    };
  }
}
