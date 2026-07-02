import { Body, Controller, Get, Param, Post, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { Permission } from "@kazihq/shared";
import { CurrentBusinessId } from "../common/decorators/current-user.decorator";
import { Public, RequirePermissions } from "../common/decorators/permissions.decorator";
import { LogActivity } from "../common/decorators/log-activity.decorator";
import { InvoicesService } from "./invoices.service";
import { CreateInvoiceDto, CreateCreditNoteDto } from "./dto/invoice.dto";

@Controller("invoices")
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @RequirePermissions(Permission.MANAGE_INVOICES)
  @Get()
  list(@CurrentBusinessId() businessId: string, @Query("status") status?: string) {
    return this.invoicesService.list(businessId, status);
  }

  @RequirePermissions(Permission.MANAGE_INVOICES)
  @Get(":id")
  get(@CurrentBusinessId() businessId: string, @Param("id") id: string) {
    return this.invoicesService.get(businessId, id);
  }

  @RequirePermissions(Permission.MANAGE_INVOICES)
  @LogActivity("invoice.create", "Invoice")
  @Post()
  create(@CurrentBusinessId() businessId: string, @Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(businessId, dto);
  }

  @RequirePermissions(Permission.MANAGE_INVOICES)
  @LogActivity("invoice.send", "Invoice")
  @Post(":id/send")
  send(
    @CurrentBusinessId() businessId: string,
    @Param("id") id: string,
    @Query("channel") channel?: "email" | "whatsapp" | "both"
  ) {
    return this.invoicesService.send(businessId, id, channel);
  }

  @RequirePermissions(Permission.MANAGE_INVOICES)
  @LogActivity("invoice.credit-note", "CreditNote")
  @Post(":id/credit-notes")
  creditNote(@CurrentBusinessId() businessId: string, @Param("id") id: string, @Body() dto: CreateCreditNoteDto) {
    return this.invoicesService.issueCreditNote(businessId, id, dto);
  }

  @RequirePermissions(Permission.MANAGE_INVOICES)
  @LogActivity("invoice.void", "Invoice")
  @Post(":id/void")
  voidInvoice(@CurrentBusinessId() businessId: string, @Param("id") id: string) {
    return this.invoicesService.voidInvoice(businessId, id);
  }

  @RequirePermissions(Permission.MANAGE_INVOICES)
  @Get(":id/pdf")
  async pdf(@CurrentBusinessId() businessId: string, @Param("id") id: string, @Res() res: Response) {
    const buffer = await this.invoicesService.generatePdf(businessId, id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="invoice-${id}.pdf"`);
    res.send(buffer);
  }

  @Public()
  @Get("public/:token")
  getPublic(@Param("token") token: string) {
    return this.invoicesService.getPublicByToken(token);
  }
}
