import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";
import { PrismaService } from "../prisma/prisma.service";

export interface QuoteDraftItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

export interface QuoteDraft {
  title: string;
  items: QuoteDraftItem[];
  notes?: string;
  suggestedDepositPercent?: number;
}

const QUOTE_DRAFT_TOOL: Anthropic.Tool = {
  name: "generate_quotation_draft",
  description: "Structured quotation draft extracted from a client conversation",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Short title for the quotation, e.g. 'Wedding Photography Package'" },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            description: { type: "string" },
            quantity: { type: "number" },
            unitPrice: { type: "number" },
            taxRate: { type: "number" },
          },
          required: ["description", "quantity", "unitPrice", "taxRate"],
        },
      },
      notes: { type: "string" },
      suggestedDepositPercent: { type: "number" },
    },
    required: ["title", "items"],
  },
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: Anthropic | null = null;

  constructor(private readonly prisma: PrismaService) {
    if (process.env.ANTHROPIC_API_KEY) {
      this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
  }

  private get model() {
    return process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
  }

  async generateQuoteDraftFromConversation(businessId: string, conversationText: string): Promise<QuoteDraft> {
    const business = await this.prisma.business.findUniqueOrThrow({ where: { id: businessId } });
    const services = await this.prisma.service.findMany({
      where: { businessId, isActive: true },
      select: { name: true, price: true, taxRate: true, durationMins: true, category: true },
    });

    if (!this.client) {
      return this.fallbackQuoteDraft(conversationText, services);
    }

    const catalogSummary = services
      .map((s) => `- ${s.name} (${s.category ?? "general"}): ${business.currency} ${s.price} / ${s.durationMins}min, VAT ${s.taxRate}%`)
      .join("\n");

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 1500,
      system:
        `You are a quoting assistant for ${business.name}, a ${business.industry} business in ${business.country}. ` +
        `Read the WhatsApp conversation between staff and a client, then produce a fair, itemized quotation draft. ` +
        `Prefer matching services from the business's catalog when the conversation mentions them. ` +
        `Default VAT/tax rate is ${business.vatRate}% unless the conversation implies otherwise. ` +
        `Business catalog:\n${catalogSummary || "(no catalog items yet)"}`,
      messages: [{ role: "user", content: conversationText }],
      tools: [QUOTE_DRAFT_TOOL],
      tool_choice: { type: "tool", name: "generate_quotation_draft" },
    });

    const toolUse = message.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new BadRequestException("AI was unable to generate a quotation draft from this conversation");
    }

    return toolUse.input as QuoteDraft;
  }

  /** Rule-based extraction used when no Anthropic API key is configured, so the feature stays usable in dev/demo. */
  private fallbackQuoteDraft(
    conversationText: string,
    services: { name: string; price: unknown; taxRate: unknown }[]
  ): QuoteDraft {
    const mentioned = services.filter((s) => conversationText.toLowerCase().includes(s.name.toLowerCase()));
    const items: QuoteDraftItem[] = (mentioned.length ? mentioned : services.slice(0, 1)).map((s) => ({
      description: s.name,
      quantity: 1,
      unitPrice: Number(s.price ?? 0),
      taxRate: Number(s.taxRate ?? 16),
    }));

    return {
      title: "Quotation draft (review before sending)",
      items,
      notes: "Generated without AI (ANTHROPIC_API_KEY not configured) — please review line items and pricing carefully.",
      suggestedDepositPercent: 30,
    };
  }

  async generateInvoiceDescription(serviceName: string, context?: string): Promise<string> {
    if (!this.client) {
      return context ? `${serviceName} — ${context}` : serviceName;
    }
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `Write one concise, professional invoice line-item description (max 20 words) for: "${serviceName}". ${
            context ? `Additional context: ${context}` : ""
          } Return only the description text, no quotes.`,
        },
      ],
    });
    const text = message.content.find((b) => b.type === "text");
    return text && text.type === "text" ? text.text.trim() : serviceName;
  }

  async pricingSuggestion(businessId: string, serviceId: string) {
    const service = await this.prisma.service.findFirst({ where: { id: serviceId, businessId } });
    if (!service) throw new BadRequestException("Service not found");

    const recentItems = await this.prisma.invoiceItem.findMany({
      where: { serviceId, invoice: { businessId } },
      orderBy: { id: "desc" },
      take: 50,
      select: { unitPrice: true },
    });

    if (recentItems.length < 3) {
      return {
        currentPrice: Number(service.price),
        suggestedPrice: Number(service.price),
        confidence: "low",
        reason: "Not enough historical invoices yet to suggest a data-driven price change.",
      };
    }

    const prices = recentItems.map((i) => Number(i.unitPrice)).sort((a, b) => a - b);
    const median = prices[Math.floor(prices.length / 2)];
    const suggestedPrice = Math.round(median * 1.05 * 100) / 100; // nudge 5% above realized median

    return {
      currentPrice: Number(service.price),
      suggestedPrice,
      confidence: recentItems.length >= 15 ? "high" : "medium",
      reason: `Based on the median of your last ${recentItems.length} invoiced line items for this service.`,
    };
  }

  /** Lightweight trailing-average forecast — deliberately heuristic rather than a black-box ML call. */
  async demandForecast(businessId: string) {
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const bookings = await this.prisma.booking.findMany({
      where: { businessId, startAt: { gte: eightWeeksAgo }, status: { not: "CANCELLED" } },
      select: { startAt: true },
    });

    const weeklyCounts = new Map<number, number>();
    for (const b of bookings) {
      const weekIndex = Math.floor((Date.now() - b.startAt.getTime()) / (7 * 24 * 60 * 60 * 1000));
      weeklyCounts.set(weekIndex, (weeklyCounts.get(weekIndex) ?? 0) + 1);
    }
    const counts = Array.from(weeklyCounts.values());
    const avgPerWeek = counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;

    return {
      basedOnWeeks: counts.length,
      averageBookingsPerWeek: Math.round(avgPerWeek * 10) / 10,
      next4WeeksForecast: [1, 2, 3, 4].map((w) => ({
        week: w,
        estimatedBookings: Math.max(0, Math.round(avgPerWeek)),
      })),
    };
  }
}
