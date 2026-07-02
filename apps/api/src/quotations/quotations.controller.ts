import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { IsDateString } from "class-validator";
import { Permission } from "@kazihq/shared";
import { CurrentBusinessId } from "../common/decorators/current-user.decorator";
import { Public, RequirePermissions } from "../common/decorators/permissions.decorator";
import { LogActivity } from "../common/decorators/log-activity.decorator";
import { QuotationsService } from "./quotations.service";
import { CreateQuotationDto, ApproveQuotationDto, DeclineQuotationDto } from "./dto/quotation.dto";

class ConvertToInvoiceDto {
  @IsDateString() dueDate!: string;
}

@Controller("quotations")
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @RequirePermissions(Permission.MANAGE_QUOTATIONS)
  @Get()
  list(@CurrentBusinessId() businessId: string, @Query("status") status?: string) {
    return this.quotationsService.list(businessId, status);
  }

  @RequirePermissions(Permission.MANAGE_QUOTATIONS)
  @Get(":id")
  get(@CurrentBusinessId() businessId: string, @Param("id") id: string) {
    return this.quotationsService.get(businessId, id);
  }

  @RequirePermissions(Permission.MANAGE_QUOTATIONS)
  @LogActivity("quotation.create", "Quotation")
  @Post()
  create(@CurrentBusinessId() businessId: string, @Body() dto: CreateQuotationDto) {
    return this.quotationsService.create(businessId, dto);
  }

  @RequirePermissions(Permission.MANAGE_QUOTATIONS)
  @LogActivity("quotation.send", "Quotation")
  @Post(":id/send")
  send(@CurrentBusinessId() businessId: string, @Param("id") id: string, @Query("channel") channel?: "email" | "whatsapp" | "both") {
    return this.quotationsService.send(businessId, id, channel);
  }

  @RequirePermissions(Permission.MANAGE_QUOTATIONS)
  @LogActivity("quotation.convert", "Invoice")
  @Post(":id/convert-to-invoice")
  convert(@CurrentBusinessId() businessId: string, @Param("id") id: string, @Body() dto: ConvertToInvoiceDto) {
    return this.quotationsService.convertToInvoice(businessId, id, new Date(dto.dueDate));
  }

  // ── Public, token-based endpoints for the WhatsApp/email approval link ──

  @Public()
  @Get("public/:token")
  getPublic(@Param("token") token: string) {
    return this.quotationsService.getPublicByToken(token);
  }

  @Public()
  @Post("public/:token/approve")
  approve(@Param("token") token: string, @Body() dto: ApproveQuotationDto, @Req() req: any) {
    return this.quotationsService.approveByToken(token, dto, req.ip);
  }

  @Public()
  @Post("public/:token/decline")
  decline(@Param("token") token: string, @Body() dto: DeclineQuotationDto) {
    return this.quotationsService.declineByToken(token, dto.reason);
  }
}
