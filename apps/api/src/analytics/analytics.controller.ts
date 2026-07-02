import { Controller, Get, Query } from "@nestjs/common";
import { Permission } from "@kazihq/shared";
import { CurrentBusinessId } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { AnalyticsService } from "./analytics.service";

@RequirePermissions(Permission.VIEW_ANALYTICS)
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("dashboard")
  dashboard(@CurrentBusinessId() businessId: string, @Query("from") from?: string, @Query("to") to?: string) {
    return this.analyticsService.revenueDashboard(businessId, from, to);
  }

  @Get("sales-trend")
  salesTrend(@CurrentBusinessId() businessId: string, @Query("months") months?: string) {
    return this.analyticsService.salesTrend(businessId, months ? Number(months) : undefined);
  }

  @Get("top-services")
  topServices(@CurrentBusinessId() businessId: string, @Query("limit") limit?: string) {
    return this.analyticsService.mostProfitableServices(businessId, limit ? Number(limit) : undefined);
  }

  @Get("customer-acquisition")
  customerAcquisition(@CurrentBusinessId() businessId: string, @Query("months") months?: string) {
    return this.analyticsService.customerAcquisition(businessId, months ? Number(months) : undefined);
  }

  @Get("conversion-rates")
  conversionRates(@CurrentBusinessId() businessId: string) {
    return this.analyticsService.bookingConversionRate(businessId);
  }

  @Get("monthly-report")
  monthlyReport(@CurrentBusinessId() businessId: string, @Query("month") month: string, @Query("year") year: string) {
    return this.analyticsService.monthlyReport(businessId, Number(month), Number(year));
  }
}
