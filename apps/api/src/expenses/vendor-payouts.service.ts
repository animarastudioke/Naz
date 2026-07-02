import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PayoutStatus } from "@kazihq/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CreateVendorPayoutDto } from "./dto/vendor-payout.dto";

@Injectable()
export class VendorPayoutsService {
  constructor(private readonly prisma: PrismaService) {}

  list(businessId: string, status?: string) {
    return this.prisma.vendorPayout.findMany({
      where: { businessId, status: status ? (status as PayoutStatus) : undefined },
      include: { vendor: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  create(businessId: string, dto: CreateVendorPayoutDto) {
    if (!dto.vendorId && !dto.vendorName) {
      throw new BadRequestException("Provide either a vendorId (team member) or vendorName (external vendor)");
    }
    return this.prisma.vendorPayout.create({
      data: {
        businessId,
        vendorId: dto.vendorId,
        vendorName: dto.vendorName,
        bookingId: dto.bookingId,
        description: dto.description,
        amount: dto.amount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
  }

  async updateStatus(businessId: string, id: string, status: PayoutStatus) {
    const payout = await this.prisma.vendorPayout.findFirst({ where: { id, businessId } });
    if (!payout) throw new NotFoundException("Payout not found");
    return this.prisma.vendorPayout.update({
      where: { id },
      data: { status, paidAt: status === PayoutStatus.PAID ? new Date() : undefined },
    });
  }
}
