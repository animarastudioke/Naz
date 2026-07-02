import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateServiceDto, UpdateServiceDto, CreateServicePackageDto } from "./dto/service.dto";

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  listServices(businessId: string) {
    return this.prisma.service.findMany({ where: { businessId, isActive: true }, orderBy: { name: "asc" } });
  }

  async createService(businessId: string, dto: CreateServiceDto) {
    return this.prisma.service.create({ data: { ...dto, businessId } });
  }

  async updateService(businessId: string, id: string, dto: UpdateServiceDto) {
    const service = await this.prisma.service.findFirst({ where: { id, businessId } });
    if (!service) throw new NotFoundException("Service not found");
    return this.prisma.service.update({ where: { id }, data: dto });
  }

  async archiveService(businessId: string, id: string) {
    const service = await this.prisma.service.findFirst({ where: { id, businessId } });
    if (!service) throw new NotFoundException("Service not found");
    return this.prisma.service.update({ where: { id }, data: { isActive: false } });
  }

  listPackages(businessId: string) {
    return this.prisma.servicePackage.findMany({
      where: { businessId, isActive: true },
      include: { items: { include: { service: true } } },
      orderBy: { name: "asc" },
    });
  }

  async createPackage(businessId: string, dto: CreateServicePackageDto) {
    return this.prisma.servicePackage.create({
      data: {
        businessId,
        name: dto.name,
        description: dto.description,
        eventType: dto.eventType,
        price: dto.price,
        items: {
          create: dto.items.map((item) => ({ serviceId: item.serviceId, quantity: item.quantity })),
        },
      },
      include: { items: { include: { service: true } } },
    });
  }
}
