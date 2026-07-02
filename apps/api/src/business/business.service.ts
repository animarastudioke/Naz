import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateBusinessDto, CreateBranchDto, UpdateIntegrationDto } from "./dto/update-business.dto";

@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: { branches: true },
    });
    if (!business) throw new NotFoundException("Business not found");
    return business;
  }

  async update(businessId: string, dto: UpdateBusinessDto) {
    return this.prisma.business.update({ where: { id: businessId }, data: dto });
  }

  async listBranches(businessId: string) {
    return this.prisma.branch.findMany({ where: { businessId }, orderBy: { createdAt: "asc" } });
  }

  async createBranch(businessId: string, dto: CreateBranchDto) {
    return this.prisma.branch.create({ data: { ...dto, businessId } });
  }

  async getIntegrations(businessId: string) {
    const integration = await this.prisma.businessIntegration.findUnique({ where: { businessId } });
    if (!integration) throw new NotFoundException("Integrations not configured");
    // Never return secrets to the client; expose only whether they're configured.
    return {
      mpesaConfigured: Boolean(integration.mpesaShortcode && integration.mpesaConsumerKey),
      mpesaEnv: integration.mpesaEnv,
      stripeConfigured: Boolean(integration.stripeSecretKey),
      whatsappConfigured: Boolean(integration.whatsappPhoneNumberId && integration.whatsappAccessToken),
    };
  }

  async updateIntegrations(businessId: string, dto: UpdateIntegrationDto) {
    await this.prisma.businessIntegration.update({ where: { businessId }, data: dto });
    return this.getIntegrations(businessId);
  }
}
