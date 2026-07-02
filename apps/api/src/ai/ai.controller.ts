import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { Permission } from "@kazihq/shared";
import { CurrentBusinessId } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { AiService } from "./ai.service";
import { InvoiceDescriptionDto, QuoteFromConversationDto } from "./dto/ai.dto";

@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @RequirePermissions(Permission.MANAGE_QUOTATIONS)
  @Post("quote-from-conversation")
  quoteFromConversation(@CurrentBusinessId() businessId: string, @Body() dto: QuoteFromConversationDto) {
    return this.aiService.generateQuoteDraftFromConversation(businessId, dto.conversationText);
  }

  @RequirePermissions(Permission.MANAGE_INVOICES)
  @Post("invoice-description")
  invoiceDescription(@Body() dto: InvoiceDescriptionDto) {
    return this.aiService.generateInvoiceDescription(dto.serviceName, dto.context);
  }

  @RequirePermissions(Permission.MANAGE_BOOKINGS)
  @Get("pricing-suggestion")
  pricingSuggestion(@CurrentBusinessId() businessId: string, @Query("serviceId") serviceId: string) {
    return this.aiService.pricingSuggestion(businessId, serviceId);
  }

  @RequirePermissions(Permission.VIEW_ANALYTICS)
  @Get("demand-forecast")
  demandForecast(@CurrentBusinessId() businessId: string) {
    return this.aiService.demandForecast(businessId);
  }
}
