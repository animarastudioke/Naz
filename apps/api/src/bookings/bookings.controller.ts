import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { BookingStatus, Permission } from "@kazihq/shared";
import { CurrentBusinessId } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { LogActivity } from "../common/decorators/log-activity.decorator";
import { BookingsService } from "./bookings.service";
import { CreateBookingDto, RescheduleBookingDto, UpdateBookingStatusDto } from "./dto/booking.dto";

@RequirePermissions(Permission.MANAGE_BOOKINGS)
@Controller("bookings")
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  list(
    @CurrentBusinessId() businessId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("status") status?: string
  ) {
    return this.bookingsService.list(businessId, from, to, status);
  }

  @Get("availability")
  availability(
    @CurrentBusinessId() businessId: string,
    @Query("serviceId") serviceId: string,
    @Query("date") date: string
  ) {
    return this.bookingsService.getAvailability(businessId, serviceId, date);
  }

  @Get(":id")
  get(@CurrentBusinessId() businessId: string, @Param("id") id: string) {
    return this.bookingsService.get(businessId, id);
  }

  @LogActivity("booking.create", "Booking")
  @Post()
  create(@CurrentBusinessId() businessId: string, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(businessId, dto);
  }

  @LogActivity("booking.status-update", "Booking")
  @Patch(":id/status")
  updateStatus(
    @CurrentBusinessId() businessId: string,
    @Param("id") id: string,
    @Body() dto: UpdateBookingStatusDto
  ) {
    return this.bookingsService.updateStatus(businessId, id, dto.status as BookingStatus, dto.cancellationReason);
  }

  @LogActivity("booking.reschedule", "Booking")
  @Patch(":id/reschedule")
  reschedule(@CurrentBusinessId() businessId: string, @Param("id") id: string, @Body() dto: RescheduleBookingDto) {
    return this.bookingsService.reschedule(businessId, id, dto);
  }
}
