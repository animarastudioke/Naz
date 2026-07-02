import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateExpenseDto, UpdateExpenseDto } from "./dto/expense.dto";

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  list(businessId: string, from?: string, to?: string) {
    return this.prisma.expense.findMany({
      where: {
        businessId,
        incurredAt: { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined },
      },
      orderBy: { incurredAt: "desc" },
    });
  }

  create(businessId: string, dto: CreateExpenseDto) {
    return this.prisma.expense.create({
      data: { ...dto, businessId, incurredAt: new Date(dto.incurredAt) },
    });
  }

  async update(businessId: string, id: string, dto: UpdateExpenseDto) {
    await this.ensureExists(businessId, id);
    return this.prisma.expense.update({
      where: { id },
      data: { ...dto, incurredAt: dto.incurredAt ? new Date(dto.incurredAt) : undefined },
    });
  }

  async remove(businessId: string, id: string) {
    await this.ensureExists(businessId, id);
    await this.prisma.expense.delete({ where: { id } });
    return { success: true };
  }

  private async ensureExists(businessId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({ where: { id, businessId } });
    if (!expense) throw new NotFoundException("Expense not found");
  }
}
