import { Module } from "@nestjs/common";
import { BookingsController } from "./bookings.controller";
import { BookingsService } from "./bookings.service";
import { ServicesController } from "./services.controller";
import { ServicesService } from "./services.service";

@Module({
  controllers: [BookingsController, ServicesController],
  providers: [BookingsService, ServicesService],
  exports: [BookingsService, ServicesService],
})
export class BookingsModule {}
