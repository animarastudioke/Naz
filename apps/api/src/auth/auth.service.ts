import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { customAlphabet } from "nanoid";
import { ROLE_PERMISSIONS, StaffRole } from "@kazihq/shared";
import { PrismaService } from "../prisma/prisma.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { AccessTokenPayload } from "../common/types/auth.types";

const slugId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

  private slugify(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    return `${base}-${slugId()}`;
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException("An account with this email already exists");

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const result = await this.prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          name: dto.businessName,
          slug: this.slugify(dto.businessName),
          industry: dto.industry,
          country: dto.country,
          currency: dto.country === "KE" ? "KES" : "USD",
          vatRate: dto.country === "KE" ? 16 : 0,
        },
      });

      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          fullName: dto.ownerName,
          phone: dto.phone,
        },
      });

      const membership = await tx.businessUser.create({
        data: {
          businessId: business.id,
          userId: user.id,
          role: StaffRole.OWNER,
          joinedAt: new Date(),
        },
      });

      await tx.branch.create({
        data: {
          businessId: business.id,
          name: "Main Branch",
          isPrimary: true,
        },
      });

      await tx.businessIntegration.create({ data: { businessId: business.id } });

      return { business, user, membership };
    });

    const tokens = await this.issueTokens({
      userId: result.user.id,
      businessId: result.business.id,
      membershipId: result.membership.id,
      role: result.membership.role,
    });

    return {
      ...tokens,
      business: { id: result.business.id, name: result.business.name, slug: result.business.slug },
      user: { id: result.user.id, fullName: result.user.fullName, email: result.user.email },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { memberships: { where: { isActive: true }, include: { business: true } } },
    });
    if (!user) throw new UnauthorizedException("Invalid email or password");

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException("Invalid email or password");
    if (!user.isActive) throw new UnauthorizedException("This account has been disabled");

    if (user.memberships.length === 0) {
      throw new UnauthorizedException("No active business memberships for this account");
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    if (user.memberships.length === 1) {
      const membership = user.memberships[0];
      const tokens = await this.issueTokens({
        userId: user.id,
        businessId: membership.businessId,
        membershipId: membership.id,
        role: membership.role,
      });
      return {
        ...tokens,
        business: { id: membership.business.id, name: membership.business.name, slug: membership.business.slug },
        user: { id: user.id, fullName: user.fullName, email: user.email },
      };
    }

    const preAuthToken = await this.jwt.signAsync(
      { sub: user.id, scope: "pre-auth" },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: "10m" }
    );

    return {
      requiresBusinessSelection: true,
      preAuthToken,
      memberships: user.memberships.map((m) => ({
        businessId: m.businessId,
        businessName: m.business.name,
        role: m.role,
      })),
    };
  }

  async selectBusiness(preAuthToken: string, businessId: string) {
    let decoded: { sub: string; scope: string };
    try {
      decoded = await this.jwt.verifyAsync(preAuthToken, { secret: process.env.JWT_ACCESS_SECRET });
    } catch {
      throw new UnauthorizedException("Business selection session expired, please log in again");
    }
    if (decoded.scope !== "pre-auth") throw new UnauthorizedException("Invalid token");

    const membership = await this.prisma.businessUser.findFirst({
      where: { userId: decoded.sub, businessId, isActive: true },
      include: { business: true, user: true },
    });
    if (!membership) throw new UnauthorizedException("No access to this business");

    const tokens = await this.issueTokens({
      userId: decoded.sub,
      businessId: membership.businessId,
      membershipId: membership.id,
      role: membership.role,
    });

    return {
      ...tokens,
      business: { id: membership.business.id, name: membership.business.name, slug: membership.business.slug },
      user: { id: membership.user.id, fullName: membership.user.fullName, email: membership.user.email },
    };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revoked: false, expiresAt: { gt: new Date() } },
      include: { user: { include: { memberships: true } } },
    });
    if (!stored) throw new UnauthorizedException("Invalid or expired refresh token");

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync(refreshToken, { secret: process.env.JWT_REFRESH_SECRET });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }

    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });

    const membership = stored.user.memberships.find((m) => m.id === payload.membershipId);
    if (!membership) throw new UnauthorizedException("Membership no longer active");

    return this.issueTokens({
      userId: stored.userId,
      businessId: membership.businessId,
      membershipId: membership.id,
      role: membership.role,
    });
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({ where: { tokenHash }, data: { revoked: true } });
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private async issueTokens(params: {
    userId: string;
    businessId: string;
    membershipId: string;
    role: StaffRole;
  }): Promise<TokenPair> {
    const permissions = ROLE_PERMISSIONS[params.role];
    const payload: AccessTokenPayload = {
      sub: params.userId,
      businessId: params.businessId,
      membershipId: params.membershipId,
      role: params.role,
      permissions,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "30d",
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.refreshToken.create({
      data: {
        userId: params.userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }
}
