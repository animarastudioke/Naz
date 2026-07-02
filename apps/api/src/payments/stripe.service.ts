import { BadRequestException, Injectable } from "@nestjs/common";
import Stripe from "stripe";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class StripeService {
  constructor(private readonly prisma: PrismaService) {}

  private async getClient(businessId: string): Promise<Stripe> {
    const integration = await this.prisma.businessIntegration.findUnique({ where: { businessId } });
    const secretKey = integration?.stripeSecretKey;
    if (!secretKey) {
      throw new BadRequestException("Stripe is not configured for this business yet. Add your secret key in Settings.");
    }
    return new Stripe(secretKey, { apiVersion: "2024-06-20" });
  }

  async createCheckoutSession(
    businessId: string,
    invoice: { id: string; number: string; currency: string; balanceDue: number },
    successUrl: string,
    cancelUrl: string
  ) {
    const stripe = await this.getClient(businessId);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: invoice.currency.toLowerCase(),
            unit_amount: Math.round(invoice.balanceDue * 100),
            product_data: { name: `Invoice ${invoice.number}` },
          },
          quantity: 1,
        },
      ],
      metadata: { businessId, invoiceId: invoice.id },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    return session;
  }

  async constructWebhookEvent(rawBody: Buffer, signature: string, businessId?: string): Promise<Stripe.Event> {
    const secretKey = businessId
      ? (await this.prisma.businessIntegration.findUnique({ where: { businessId } }))?.stripeSecretKey
      : undefined;
    const stripe = new Stripe(secretKey ?? "sk_placeholder", { apiVersion: "2024-06-20" });
    return stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET ?? "");
  }
}
