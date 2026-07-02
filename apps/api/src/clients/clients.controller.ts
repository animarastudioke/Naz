import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { Permission } from "@kazihq/shared";
import { CurrentBusinessId } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { LogActivity } from "../common/decorators/log-activity.decorator";
import { ClientsService } from "./clients.service";
import { CreateClientDto, UpdateClientDto, AddCommunicationDto } from "./dto/client.dto";

@RequirePermissions(Permission.MANAGE_CLIENTS)
@Controller("clients")
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  list(
    @CurrentBusinessId() businessId: string,
    @Query("search") search?: string,
    @Query("segment") segment?: string
  ) {
    return this.clientsService.list(businessId, search, segment);
  }

  @Get(":id")
  get(@CurrentBusinessId() businessId: string, @Param("id") id: string) {
    return this.clientsService.get(businessId, id);
  }

  @LogActivity("client.create", "Client")
  @Post()
  create(@CurrentBusinessId() businessId: string, @Body() dto: CreateClientDto) {
    return this.clientsService.create(businessId, dto);
  }

  @LogActivity("client.update", "Client")
  @Patch(":id")
  update(@CurrentBusinessId() businessId: string, @Param("id") id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(businessId, id, dto);
  }

  @LogActivity("client.delete", "Client")
  @Delete(":id")
  remove(@CurrentBusinessId() businessId: string, @Param("id") id: string) {
    return this.clientsService.remove(businessId, id);
  }

  @Post(":id/communications")
  addCommunication(
    @CurrentBusinessId() businessId: string,
    @Param("id") id: string,
    @Body() dto: AddCommunicationDto
  ) {
    return this.clientsService.addCommunication(businessId, id, dto);
  }
}
