import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { PrismaModule } from "./prisma/prisma.module";
import { CommonModule } from "./common/common.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { PermissionsGuard } from "./common/guards/permissions.guard";
import { ActivityLogInterceptor } from "./common/interceptors/activity-log.interceptor";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

import { AuthModule } from "./auth/auth.module";
import { BusinessModule } from "./business/business.module";
import { UsersModule } from "./users/users.module";
import { ClientsModule } from "./clients/clients.module";
import { BookingsModule } from "./bookings/bookings.module";
import { QuotationsModule } from "./quotations/quotations.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { PaymentsModule } from "./payments/payments.module";
import { ExpensesModule } from "./expenses/expenses.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { WhatsappModule } from "./whatsapp/whatsapp.module";
import { AiModule } from "./ai/ai.module";
import { PublicModule } from "./public/public.module";
import { SchedulerModule } from "./scheduler/scheduler.module";
import { HealthController } from "./health/health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60000, limit: 120 }] }),
    PrismaModule,
    CommonModule,
    NotificationsModule,
    AuthModule,
    BusinessModule,
    UsersModule,
    ClientsModule,
    BookingsModule,
    QuotationsModule,
    InvoicesModule,
    PaymentsModule,
    ExpensesModule,
    AnalyticsModule,
    WhatsappModule,
    AiModule,
    PublicModule,
    SchedulerModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: ActivityLogInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
