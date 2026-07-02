import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BookingStatus } from "@kazihq/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBookingDto, RescheduleBookingDto } from "./dto/booking.dto";

const BUSINESS_HOURS = { startHour: 8, endHour: 18 };
const SLOT_MINUTES = 30;

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(businessId: string, from?: string, to?: string, status?: string) {
    return this.prisma.booking.findMany({
      where: {
        businessId,
        status: status ? (status as BookingStatus) : undefined,
        startAt: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
      include: { client: true, service: true, staff: { include: { user: true } } },
      orderBy: { startAt: "asc" },
    });
  }

  async get(businessId: string, id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, businessId },
      include: { client: true, service: true, staff: { include: { user: true } }, branch: true },
    });
    if (!booking) throw new NotFoundException("Booking not found");
    return booking;
  }

  private async assertNoOverlap(params: {
    businessId: string;
    staffId?: string;
    startAt: Date;
    endAt: Date;
    excludeBookingId?: string;
  }) {
    const overlapping = await this.prisma.booking.findFirst({
      where: {
        businessId: params.businessId,
        id: params.excludeBookingId ? { not: params.excludeBookingId } : undefined,
        staffId: params.staffId ?? undefined,
        status: { notIn: [BookingStatus.CANCELLED, BookingStatus.NO_SHOW] },
        AND: [{ startAt: { lt: params.endAt } }, { endAt: { gt: params.startAt } }],
      },
    });
    if (overlapping) {
      throw new BadRequestException("This time slot conflicts with an existing booking");
    }
  }

  async create(businessId: string, dto: CreateBookingDto, initialStatus: BookingStatus = BookingStatus.CONFIRMED) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (endAt <= startAt) throw new BadRequestException("endAt must be after startAt");

    await this.assertNoOverlap({ businessId, staffId: dto.staffId, startAt, endAt });

    return this.prisma.booking.create({
      data: {
        businessId,
        clientId: dto.clientId,
        serviceId: dto.serviceId,
        branchId: dto.branchId,
        staffId: dto.staffId,
        startAt,
        endAt,
        notes: dto.notes,
        depositAmount: dto.depositAmount,
        status: initialStatus,
      },
      include: { client: true, service: true },
    });
  }

  async updateStatus(businessId: string, id: string, status: BookingStatus, cancellationReason?: string) {
    const booking = await this.get(businessId, id);
    return this.prisma.booking.update({
      where: { id: booking.id },
      data: { status, cancellationReason: status === BookingStatus.CANCELLED ? cancellationReason : undefined },
    });
  }

  async reschedule(businessId: string, id: string, dto: RescheduleBookingDto) {
    const booking = await this.get(businessId, id);
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (endAt <= startAt) throw new BadRequestException("endAt must be after startAt");

    await this.assertNoOverlap({
      businessId,
      staffId: booking.staffId ?? undefined,
      startAt,
      endAt,
      excludeBookingId: booking.id,
    });

    return this.prisma.booking.update({
      where: { id: booking.id },
      data: { startAt, endAt, status: BookingStatus.RESCHEDULED },
    });
  }

  async markDepositPaid(bookingId: string) {
    return this.prisma.booking.update({ where: { id: bookingId }, data: { depositPaid: true } });
  }

  async getAvailability(businessId: string, serviceId: string, dateIso: string) {
    const service = await this.prisma.service.findFirst({ where: { id: serviceId, businessId } });
    if (!service) throw new NotFoundException("Service not found");

    const date = new Date(dateIso);
    const dayStart = new Date(date);
    dayStart.setHours(BUSINESS_HOURS.startHour, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(BUSINESS_HOURS.endHour, 0, 0, 0);

    const existingBookings = await this.prisma.booking.findMany({
      where: {
        businessId,
        serviceId,
        status: { notIn: [BookingStatus.CANCELLED, BookingStatus.NO_SHOW] },
        startAt: { gte: dayStart, lt: dayEnd },
      },
      select: { startAt: true, endAt: true },
    });

    const durationMs = service.durationMins * 60 * 1000;
    const slots: { startAt: string; endAt: string; available: boolean }[] = [];

    for (let cursor = dayStart.getTime(); cursor + durationMs <= dayEnd.getTime(); cursor += SLOT_MINUTES * 60 * 1000) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor + durationMs);
      const conflicts = existingBookings.some(
        (b) => slotStart < b.endAt && slotEnd > b.startAt
      );
      if (!conflicts) {
        slots.push({ startAt: slotStart.toISOString(), endAt: slotEnd.toISOString(), available: true });
      }
    }

    return { date: dayStart.toISOString().slice(0, 10), durationMins: service.durationMins, slots };
  }
}
