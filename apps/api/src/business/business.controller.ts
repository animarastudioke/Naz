import { Body, Controller, Get, Patch, Post } from "@nestjs/common";
import { Permission } from "@kazihq/shared";
import { CurrentBusinessId } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { LogActivity } from "../common/decorators/log-activity.decorator";
import { BusinessService } from "./business.service";
import { UpdateBusinessDto, CreateBranchDto, UpdateIntegrationDto } from "./dto/update-business.dto";

@Controller("business")
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get("me")
  getProfile(@CurrentBusinessId() businessId: string) {
    return this.businessService.getProfile(businessId);
  }

  @RequirePermissions(Permission.MANAGE_SETTINGS)
  @LogActivity("business.update", "Business")
  @Patch("me")
  update(@CurrentBusinessId() businessId: string, @Body() dto: UpdateBusinessDto) {
    return this.businessService.update(businessId, dto);
  }

  @Get("branches")
  listBranches(@CurrentBusinessId() businessId: string) {
    return this.businessService.listBranches(businessId);
  }

  @RequirePermissions(Permission.MANAGE_SETTINGS)
  @LogActivity("branch.create", "Branch")
  @Post("branches")
  createBranch(@CurrentBusinessId() businessId: string, @Body() dto: CreateBranchDto) {
    return this.businessService.createBranch(businessId, dto);
  }

  @RequirePermissions(Permission.MANAGE_SETTINGS)
  @Get("integrations")
  getIntegrations(@CurrentBusinessId() businessId: string) {
    return this.businessService.getIntegrations(businessId);
  }

  @RequirePermissions(Permission.MANAGE_SETTINGS)
  @LogActivity("integrations.update", "BusinessIntegration")
  @Patch("integrations")
  updateIntegrations(@CurrentBusinessId() businessId: string, @Body() dto: UpdateIntegrationDto) {
    return this.businessService.updateIntegrations(businessId, dto);
  }
}
