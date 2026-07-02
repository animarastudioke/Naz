import { Injectable, NotFoundException } from "@nestjs/common";
import { CommunicationChannel } from "@kazihq/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CreateClientDto, UpdateClientDto, AddCommunicationDto } from "./dto/client.dto";

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(businessId: string, search?: string, segment?: string) {
    return this.prisma.client.findMany({
      where: {
        businessId,
        segment: segment || undefined,
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { phone: { contains: search } },
                { company: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(businessId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, businessId },
      include: {
        bookings: { orderBy: { startAt: "desc" }, include: { service: true } },
        quotations: { orderBy: { createdAt: "desc" } },
        invoices: { orderBy: { createdAt: "desc" } },
        payments: { orderBy: { createdAt: "desc" } },
        communications: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!client) throw new NotFoundException("Client not found");
    return client;
  }

  async create(businessId: string, dto: CreateClientDto) {
    return this.prisma.client.create({ data: { ...dto, businessId } });
  }

  async update(businessId: string, id: string, dto: UpdateClientDto) {
    await this.ensureExists(businessId, id);
    return this.prisma.client.update({ where: { id }, data: dto });
  }

  async remove(businessId: string, id: string) {
    await this.ensureExists(businessId, id);
    await this.prisma.client.delete({ where: { id } });
    return { success: true };
  }

  async addCommunication(businessId: string, clientId: string, dto: AddCommunicationDto) {
    await this.ensureExists(businessId, clientId);
    return this.prisma.communicationEntry.create({
      data: {
        clientId,
        channel: dto.channel as CommunicationChannel,
        direction: dto.direction,
        subject: dto.subject,
        message: dto.message,
      },
    });
  }

  async addLoyaltyPoints(businessId: string, clientId: string, points: number) {
    await this.ensureExists(businessId, clientId);
    return this.prisma.client.update({
      where: { id: clientId },
      data: { loyaltyPoints: { increment: points } },
    });
  }

  private async ensureExists(businessId: string, id: string) {
    const client = await this.prisma.client.findFirst({ where: { id, businessId } });
    if (!client) throw new NotFoundException("Client not found");
    return client;
  }
}
