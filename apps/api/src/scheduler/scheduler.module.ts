import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { SchedulerService } from "./scheduler.service";
import { InvoicesModule } from "../invoices/invoices.module";
import { WhatsappModule } from "../whatsapp/whatsapp.module";

@Module({
  imports: [ScheduleModule.forRoot(), InvoicesModule, WhatsappModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
