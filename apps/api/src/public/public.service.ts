import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BookingStatus } from "@kazihq/shared";
import { PrismaService } from "../prisma/prisma.service";
import { BookingsService } from "../bookings/bookings.service";
import { CreatePublicBookingDto, RescheduleByTokenDto } from "./dto/public-booking.dto";

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingsService: BookingsService
  ) {}

  async getBookingPage(slug: string) {
    const business = await this.prisma.business.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        brandColor: true,
        currency: true,
        industry: true,
        services: { where: { isActive: true }, orderBy: { name: "asc" } },
        servicePackages: { where: { isActive: true }, include: { items: { include: { service: true } } } },
        branches: { select: { id: true, name: true, address: true } },
      },
    });
    if (!business) throw new NotFoundException("Booking page not found");
    return business;
  }

  async getAvailability(slug: string, serviceId: string, date: string) {
    const business = await this.prisma.business.findUnique({ where: { slug }, select: { id: true } });
    if (!business) throw new NotFoundException("Booking page not found");
    return this.bookingsService.getAvailability(business.id, serviceId, date);
  }

  async createBooking(slug: string, dto: CreatePublicBookingDto) {
    const business = await this.prisma.business.findUnique({ where: { slug }, select: { id: true } });
    if (!business) throw new NotFoundException("Booking page not found");

    let client = await this.prisma.client.findFirst({
      where: { businessId: business.id, phone: dto.clientPhone },
    });
    if (!client) {
      client = await this.prisma.client.create({
        data: {
          businessId: business.id,
          fullName: dto.clientFullName,
          phone: dto.clientPhone,
          email: dto.clientEmail,
          source: "online-booking-page",
        },
      });
    }

    return this.bookingsService.create(
      business.id,
      {
        clientId: client.id,
        serviceId: dto.serviceId,
        startAt: dto.startAt,
        endAt: dto.endAt,
        notes: dto.notes,
      },
      BookingStatus.PENDING
    );
  }

  async getBookingByToken(token: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { publicToken: token },
      include: { service: true, client: { select: { fullName: true, phone: true } }, business: { select: { name: true, brandColor: true } } },
    });
    if (!booking) throw new NotFoundException("Booking not found");
    return booking;
  }

  async rescheduleByToken(token: string, dto: RescheduleByTokenDto) {
    const booking = await this.prisma.booking.findUnique({ where: { publicToken: token } });
    if (!booking) throw new NotFoundException("Booking not found");
    return this.bookingsService.reschedule(booking.businessId, booking.id, dto);
  }

  async cancelByToken(token: string, reason?: string) {
    const booking = await this.prisma.booking.findUnique({ where: { publicToken: token } });
    if (!booking) throw new NotFoundException("Booking not found");
    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException("This booking is already completed and cannot be cancelled");
    }
    return this.bookingsService.updateStatus(booking.businessId, booking.id, BookingStatus.CANCELLED, reason);
  }
}
