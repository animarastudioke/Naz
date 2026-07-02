import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { IsEnum } from "class-validator";
import { Permission, PayoutStatus } from "@kazihq/shared";
import { CurrentBusinessId } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { LogActivity } from "../common/decorators/log-activity.decorator";
import { VendorPayoutsService } from "./vendor-payouts.service";
import { CreateVendorPayoutDto } from "./dto/vendor-payout.dto";

class UpdatePayoutStatusDto {
  @IsEnum(PayoutStatus) status!: PayoutStatus;
}

@RequirePermissions(Permission.MANAGE_EXPENSES)
@Controller("vendor-payouts")
export class VendorPayoutsController {
  constructor(private readonly vendorPayoutsService: VendorPayoutsService) {}

  @Get()
  list(@CurrentBusinessId() businessId: string, @Query("status") status?: string) {
    return this.vendorPayoutsService.list(businessId, status);
  }

  @LogActivity("vendor-payout.create", "VendorPayout")
  @Post()
  create(@CurrentBusinessId() businessId: string, @Body() dto: CreateVendorPayoutDto) {
    return this.vendorPayoutsService.create(businessId, dto);
  }

  @LogActivity("vendor-payout.status-update", "VendorPayout")
  @Patch(":id/status")
  updateStatus(@CurrentBusinessId() businessId: string, @Param("id") id: string, @Body() dto: UpdatePayoutStatusDto) {
    return this.vendorPayoutsService.updateStatus(businessId, id, dto.status);
  }
}
