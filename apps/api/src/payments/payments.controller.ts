import { Body, Controller, Get, Headers, Param, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { Permission } from "@kazihq/shared";
import { CurrentBusinessId } from "../common/decorators/current-user.decorator";
import { Public, RequirePermissions } from "../common/decorators/permissions.decorator";
import { LogActivity } from "../common/decorators/log-activity.decorator";
import { PaymentsService } from "./payments.service";
import { StkPushDto, StripeCheckoutDto, CreatePaymentLinkDto, RecordManualPaymentDto } from "./dto/payments.dto";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @RequirePermissions(Permission.MANAGE_PAYMENTS)
  @Get()
  list(@CurrentBusinessId() businessId: string, @Query("status") status?: string) {
    return this.paymentsService.list(businessId, status);
  }

  @RequirePermissions(Permission.MANAGE_PAYMENTS)
  @LogActivity("payment.mpesa-stk", "Payment")
  @Post("mpesa/stk-push")
  stkPush(@CurrentBusinessId() businessId: string, @Body() dto: StkPushDto) {
    return this.paymentsService.initiateStkPush(businessId, dto);
  }

  @Public()
  @Post("mpesa/callback")
  mpesaCallback(@Body() payload: any) {
    return this.paymentsService.handleMpesaCallback(payload);
  }

  @Public()
  @Post("public/:invoiceToken/mpesa-stk-push")
  publicStkPush(@Param("invoiceToken") invoiceToken: string, @Body("phoneNumber") phoneNumber: string) {
    return this.paymentsService.initiatePublicStkPush(invoiceToken, phoneNumber);
  }

  @Public()
  @Post("public/links/:linkToken/mpesa-stk-push")
  publicStkPushForLink(@Param("linkToken") linkToken: string, @Body("phoneNumber") phoneNumber: string) {
    return this.paymentsService.initiatePublicStkPushForPaymentLink(linkToken, phoneNumber);
  }

  @RequirePermissions(Permission.MANAGE_PAYMENTS)
  @Post("stripe/checkout")
  stripeCheckout(@CurrentBusinessId() businessId: string, @Body() dto: StripeCheckoutDto) {
    return this.paymentsService.createStripeCheckout(businessId, dto);
  }

  @Public()
  @Post("stripe/webhook")
  async stripeWebhook(@Req() req: Request & { rawBody?: Buffer }, @Headers("stripe-signature") signature: string) {
    return this.paymentsService.handleStripeWebhook(req.rawBody ?? Buffer.from(""), signature);
  }

  @RequirePermissions(Permission.MANAGE_PAYMENTS)
  @LogActivity("payment.link-create", "Payment")
  @Post("links")
  createLink(@CurrentBusinessId() businessId: string, @Body() dto: CreatePaymentLinkDto) {
    return this.paymentsService.createPaymentLink(businessId, dto.invoiceId);
  }

  @Public()
  @Get("links/:token")
  getLink(@Param("token") token: string) {
    return this.paymentsService.getPaymentLink(token);
  }

  @RequirePermissions(Permission.MANAGE_PAYMENTS)
  @LogActivity("payment.manual-record", "Payment")
  @Post("manual")
  recordManual(@CurrentBusinessId() businessId: string, @Body() dto: RecordManualPaymentDto) {
    return this.paymentsService.recordManualPayment(businessId, dto);
  }

  @RequirePermissions(Permission.MANAGE_PAYMENTS)
  @LogActivity("payment.reconcile", "Payment")
  @Post(":id/reconcile")
  reconcile(@CurrentBusinessId() businessId: string, @Param("id") id: string) {
    return this.paymentsService.markReconciled(businessId, id);
  }
}
