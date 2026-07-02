import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { Permission } from "@kazihq/shared";
import { CurrentBusinessId } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { LogActivity } from "../common/decorators/log-activity.decorator";
import { ServicesService } from "./services.service";
import { CreateServiceDto, UpdateServiceDto, CreateServicePackageDto } from "./dto/service.dto";

@RequirePermissions(Permission.MANAGE_BOOKINGS)
@Controller("services")
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  list(@CurrentBusinessId() businessId: string) {
    return this.servicesService.listServices(businessId);
  }

  @LogActivity("service.create", "Service")
  @Post()
  create(@CurrentBusinessId() businessId: string, @Body() dto: CreateServiceDto) {
    return this.servicesService.createService(businessId, dto);
  }

  @LogActivity("service.update", "Service")
  @Patch(":id")
  update(@CurrentBusinessId() businessId: string, @Param("id") id: string, @Body() dto: UpdateServiceDto) {
    return this.servicesService.updateService(businessId, id, dto);
  }

  @LogActivity("service.archive", "Service")
  @Delete(":id")
  archive(@CurrentBusinessId() businessId: string, @Param("id") id: string) {
    return this.servicesService.archiveService(businessId, id);
  }

  @Get("packages/all")
  listPackages(@CurrentBusinessId() businessId: string) {
    return this.servicesService.listPackages(businessId);
  }

  @LogActivity("service-package.create", "ServicePackage")
  @Post("packages")
  createPackage(@CurrentBusinessId() businessId: string, @Body() dto: CreateServicePackageDto) {
    return this.servicesService.createPackage(businessId, dto);
  }
}
