import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { nanoid } from "nanoid";
import { PaymentMethod, PaymentStatus } from "@kazihq/shared";
import { PrismaService } from "../prisma/prisma.service";
import { InvoicesService } from "../invoices/invoices.service";
import { BookingsService } from "../bookings/bookings.service";
import { MpesaService } from "./mpesa.service";
import { StripeService } from "./stripe.service";
import { StkPushDto, StripeCheckoutDto, RecordManualPaymentDto } from "./dto/payments.dto";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mpesa: MpesaService,
    private readonly stripe: StripeService,
    private readonly invoicesService: InvoicesService,
    private readonly bookingsService: BookingsService
  ) {}

  async list(businessId: string, status?: string) {
    return this.prisma.payment.findMany({
      where: { businessId, status: status ? (status as PaymentStatus) : undefined },
      include: { client: true, invoice: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async initiateStkPush(businessId: string, dto: StkPushDto) {
    if (!dto.invoiceId && !dto.bookingId) {
      throw new BadRequestException("Provide either an invoiceId or bookingId to attach this payment to");
    }

    const result = await this.mpesa.stkPush(businessId, dto.phoneNumber, dto.amount, dto.accountReference);

    return this.prisma.payment.create({
      data: {
        businessId,
        invoiceId: dto.invoiceId,
        bookingId: dto.bookingId,
        method: PaymentMethod.MPESA_STK,
        status: PaymentStatus.PENDING,
        amount: dto.amount,
        mpesaCheckoutRequestId: result.checkoutRequestId,
        mpesaMerchantRequestId: result.merchantRequestId,
        mpesaPhoneNumber: dto.phoneNumber,
      },
    });
  }

  async handleMpesaCallback(payload: any) {
    const stkCallback = payload?.Body?.stkCallback;
    if (!stkCallback) return { received: true };

    const checkoutRequestId = stkCallback.CheckoutRequestID;
    const payment = await this.prisma.payment.findUnique({ where: { mpesaCheckoutRequestId: checkoutRequestId } });
    if (!payment) return { received: true };

    if (stkCallback.ResultCode === 0) {
      const metadata: { Name: string; Value: string | number }[] = stkCallback.CallbackMetadata?.Item ?? [];
      const receipt = metadata.find((m) => m.Name === "MpesaReceiptNumber")?.Value as string | undefined;

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.SUCCESS, mpesaReceiptNumber: receipt, paidAt: new Date(), reconciled: true },
      });

      await this.onPaymentSuccess(payment.id);
    } else {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED, failureReason: stkCallback.ResultDesc },
      });
    }

    return { received: true };
  }

  /** Lets a client self-serve pay from their invoice link, without needing a staff login. */
  async initiatePublicStkPush(invoiceToken: string, phoneNumber: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { publicToken: invoiceToken } });
    if (!invoice) throw new BadRequestException("Invoice not found");
    if (Number(invoice.balanceDue) <= 0) throw new BadRequestException("This invoice is already fully paid");

    return this.initiateStkPush(invoice.businessId, {
      invoiceId: invoice.id,
      phoneNumber,
      amount: Number(invoice.balanceDue),
      accountReference: invoice.number,
    });
  }

  async createStripeCheckout(businessId: string, dto: StripeCheckoutDto) {
    const invoice = await this.invoicesService.get(businessId, dto.invoiceId);
    const session = await this.stripe.createCheckoutSession(
      businessId,
      { id: invoice.id, number: invoice.number, currency: invoice.currency, balanceDue: Number(invoice.balanceDue) },
      dto.successUrl,
      dto.cancelUrl
    );

    await this.prisma.payment.create({
      data: {
        businessId,
        invoiceId: invoice.id,
        clientId: invoice.clientId,
        method: PaymentMethod.CARD_STRIPE,
        status: PaymentStatus.PENDING,
        amount: invoice.balanceDue,
        stripePaymentIntentId: session.payment_intent as string | undefined,
      },
    });

    return { checkoutUrl: session.url };
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string) {
    const event = await this.stripe.constructWebhookEvent(rawBody, signature);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const invoiceId = session.metadata?.invoiceId;
      if (invoiceId) {
        const payment = await this.prisma.payment.findFirst({ where: { invoiceId, status: PaymentStatus.PENDING } });
        if (payment) {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.SUCCESS,
              stripeChargeId: session.payment_intent,
              paidAt: new Date(),
              reconciled: true,
            },
          });
          await this.onPaymentSuccess(payment.id);
        }
      }
    }
    return { received: true };
  }

  async createPaymentLink(businessId: string, invoiceId: string) {
    const invoice = await this.invoicesService.get(businessId, invoiceId);
    const token = nanoid(24);

    const payment = await this.prisma.payment.create({
      data: {
        businessId,
        invoiceId: invoice.id,
        clientId: invoice.clientId,
        method: PaymentMethod.PAYMENT_LINK,
        status: PaymentStatus.PENDING,
        amount: invoice.balanceDue,
        paymentLinkToken: token,
      },
    });

    return { paymentLinkToken: payment.paymentLinkToken, url: `${process.env.WEB_APP_URL}/pay/${token}` };
  }

  async initiatePublicStkPushForPaymentLink(linkToken: string, phoneNumber: string) {
    const link = await this.prisma.payment.findUnique({ where: { paymentLinkToken: linkToken }, include: { invoice: true } });
    if (!link || !link.invoice) throw new BadRequestException("Payment link not found");
    if (Number(link.invoice.balanceDue) <= 0) throw new BadRequestException("This invoice is already fully paid");

    return this.initiateStkPush(link.businessId, {
      invoiceId: link.invoice.id,
      phoneNumber,
      amount: Number(link.invoice.balanceDue),
      accountReference: link.invoice.number,
    });
  }

  async getPaymentLink(token: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { paymentLinkToken: token },
      include: { invoice: { include: { business: true } } },
    });
    if (!payment) throw new NotFoundException("Payment link not found or expired");
    return payment;
  }

  async recordManualPayment(businessId: string, dto: RecordManualPaymentDto) {
    if (!dto.invoiceId && !dto.bookingId) {
      throw new BadRequestException("Provide either an invoiceId or bookingId");
    }

    const payment = await this.prisma.payment.create({
      data: {
        businessId,
        invoiceId: dto.invoiceId,
        bookingId: dto.bookingId,
        clientId: dto.clientId,
        method: dto.method as PaymentMethod,
        status: PaymentStatus.SUCCESS,
        amount: dto.amount,
        paidAt: new Date(),
        reconciled: false,
      },
    });

    await this.onPaymentSuccess(payment.id);
    return payment;
  }

  async markReconciled(businessId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({ where: { id: paymentId, businessId } });
    if (!payment) throw new NotFoundException("Payment not found");
    return this.prisma.payment.update({ where: { id: paymentId }, data: { reconciled: true } });
  }

  private async onPaymentSuccess(paymentId: string) {
    const payment = await this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    if (payment.invoiceId) {
      await this.invoicesService.applyPayment(payment.invoiceId, Number(payment.amount));
    }
    if (payment.bookingId) {
      await this.bookingsService.markDepositPaid(payment.bookingId);
    }
  }
}
