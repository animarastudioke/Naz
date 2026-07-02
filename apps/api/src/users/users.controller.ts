import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { IsString, MinLength } from "class-validator";
import { Permission } from "@kazihq/shared";
import { CurrentBusinessId } from "../common/decorators/current-user.decorator";
import { RequirePermissions, Public } from "../common/decorators/permissions.decorator";
import { LogActivity } from "../common/decorators/log-activity.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "./users.service";
import { InviteUserDto, UpdateMembershipDto } from "./dto/invite-user.dto";

class AcceptInviteDto {
  @IsString() token!: string;
  @IsString() @MinLength(8) password!: string;
}

@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  listTeam(@CurrentBusinessId() businessId: string) {
    return this.usersService.listTeam(businessId);
  }

  @RequirePermissions(Permission.MANAGE_TEAM)
  @LogActivity("team.invite", "BusinessUser")
  @Post("invite")
  async invite(@CurrentBusinessId() businessId: string, @Body() dto: InviteUserDto) {
    const business = await this.prisma.business.findUniqueOrThrow({ where: { id: businessId } });
    return this.usersService.invite(businessId, business.name, dto);
  }

  @Public()
  @Post("accept-invite")
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.usersService.acceptInvite(dto.token, dto.password);
  }

  @RequirePermissions(Permission.MANAGE_TEAM)
  @LogActivity("team.update", "BusinessUser")
  @Patch(":membershipId")
  update(
    @CurrentBusinessId() businessId: string,
    @Param("membershipId") membershipId: string,
    @Body() dto: UpdateMembershipDto
  ) {
    return this.usersService.updateMembership(businessId, membershipId, dto);
  }

  @RequirePermissions(Permission.MANAGE_TEAM)
  @LogActivity("team.remove", "BusinessUser")
  @Delete(":membershipId")
  remove(@CurrentBusinessId() businessId: string, @Param("membershipId") membershipId: string) {
    return this.usersService.removeMembership(businessId, membershipId);
  }
}
