import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { MpesaService } from "./mpesa.service";
import { StripeService } from "./stripe.service";
import { InvoicesModule } from "../invoices/invoices.module";
import { BookingsModule } from "../bookings/bookings.module";

@Module({
  imports: [InvoicesModule, BookingsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, MpesaService, StripeService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
