import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { InviteUserDto, UpdateMembershipDto } from "./dto/invite-user.dto";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly notifications: NotificationsService
  ) {}

  async listTeam(businessId: string) {
    return this.prisma.businessUser.findMany({
      where: { businessId },
      include: { user: { select: { id: true, fullName: true, email: true, avatarUrl: true, lastLoginAt: true } }, branch: true },
      orderBy: { invitedAt: "asc" },
    });
  }

  async invite(businessId: string, businessName: string, dto: InviteUserDto) {
    let user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user) {
      const placeholderPassword = await bcrypt.hash(randomBytes(24).toString("hex"), 12);
      user = await this.prisma.user.create({
        data: { email: dto.email, fullName: dto.fullName, passwordHash: placeholderPassword },
      });
    }

    const existingMembership = await this.prisma.businessUser.findUnique({
      where: { businessId_userId: { businessId, userId: user.id } },
    });
    if (existingMembership) throw new BadRequestException("This person is already part of your team");

    const membership = await this.prisma.businessUser.create({
      data: { businessId, userId: user.id, role: dto.role, branchId: dto.branchId },
    });

    const inviteToken = await this.jwt.signAsync(
      { sub: user.id, membershipId: membership.id, scope: "invite" },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: "7d" }
    );

    await this.notifications.sendTeamInviteEmail(dto.email, businessName, inviteToken);

    return membership;
  }

  async acceptInvite(token: string, password: string) {
    let decoded: { sub: string; membershipId: string; scope: string };
    try {
      decoded = await this.jwt.verifyAsync(token, { secret: process.env.JWT_ACCESS_SECRET });
    } catch {
      throw new BadRequestException("Invite link is invalid or expired");
    }
    if (decoded.scope !== "invite") throw new BadRequestException("Invalid invite token");

    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.user.update({ where: { id: decoded.sub }, data: { passwordHash } });
    const membership = await this.prisma.businessUser.update({
      where: { id: decoded.membershipId },
      data: { joinedAt: new Date() },
    });
    return membership;
  }

  async updateMembership(businessId: string, membershipId: string, dto: UpdateMembershipDto) {
    const membership = await this.prisma.businessUser.findFirst({ where: { id: membershipId, businessId } });
    if (!membership) throw new NotFoundException("Team member not found");
    return this.prisma.businessUser.update({ where: { id: membershipId }, data: dto });
  }

  async removeMembership(businessId: string, membershipId: string) {
    const membership = await this.prisma.businessUser.findFirst({ where: { id: membershipId, businessId } });
    if (!membership) throw new NotFoundException("Team member not found");
    if (membership.role === "OWNER") throw new BadRequestException("Cannot remove the business owner");
    return this.prisma.businessUser.update({ where: { id: membershipId }, data: { isActive: false } });
  }
}
