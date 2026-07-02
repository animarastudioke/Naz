import { Injectable } from "@nestjs/common";
import { formatDocumentNumber } from "@kazihq/shared";
import { PrismaService } from "../../prisma/prisma.service";

export type DocumentType = "INVOICE" | "QUOTATION";

@Injectable()
export class DocumentNumberingService {
  constructor(private readonly prisma: PrismaService) {}

  async next(businessId: string, docType: DocumentType, prefix: string): Promise<string> {
    const year = new Date().getFullYear();

    const counter = await this.prisma.documentCounter.upsert({
      where: { businessId_docType_year: { businessId, docType, year } },
      update: { sequence: { increment: 1 } },
      create: { businessId, docType, year, sequence: 1 },
    });

    return formatDocumentNumber(prefix, year, counter.sequence);
  }
}
