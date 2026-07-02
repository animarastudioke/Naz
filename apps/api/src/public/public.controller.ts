import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { IsOptional, IsString } from "class-validator";
import { Public } from "../common/decorators/permissions.decorator";
import { PublicService } from "./public.service";
import { CreatePublicBookingDto, RescheduleByTokenDto } from "./dto/public-booking.dto";

class CancelBookingDto {
  @IsOptional() @IsString() reason?: string;
}

@Public()
@Controller("public")
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get("business/:slug")
  getBookingPage(@Param("slug") slug: string) {
    return this.publicService.getBookingPage(slug);
  }

  @Get("business/:slug/availability")
  getAvailability(@Param("slug") slug: string, @Query("serviceId") serviceId: string, @Query("date") date: string) {
    return this.publicService.getAvailability(slug, serviceId, date);
  }

  @Post("business/:slug/bookings")
  createBooking(@Param("slug") slug: string, @Body() dto: CreatePublicBookingDto) {
    return this.publicService.createBooking(slug, dto);
  }

  @Get("bookings/:token")
  getBooking(@Param("token") token: string) {
    return this.publicService.getBookingByToken(token);
  }

  @Post("bookings/:token/reschedule")
  reschedule(@Param("token") token: string, @Body() dto: RescheduleByTokenDto) {
    return this.publicService.rescheduleByToken(token, dto);
  }

  @Post("bookings/:token/cancel")
  cancel(@Param("token") token: string, @Body() dto: CancelBookingDto) {
    return this.publicService.cancelByToken(token, dto.reason);
  }
}
