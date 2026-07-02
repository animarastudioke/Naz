import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { IsString } from "class-validator";
import { Permission } from "@kazihq/shared";
import { CurrentBusinessId } from "../common/decorators/current-user.decorator";
import { Public, RequirePermissions } from "../common/decorators/permissions.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { WhatsappService } from "./whatsapp.service";

class SendMessageDto {
  @IsString() clientPhone!: string;
  @IsString() message!: string;
}

@Controller("whatsapp")
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly prisma: PrismaService
  ) {}

  @Public()
  @Get("webhook")
  verifyWebhook(
    @Query("hub.mode") mode: string,
    @Query("hub.verify_token") token: string,
    @Query("hub.challenge") challenge: string
  ) {
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return challenge;
    }
    return "Forbidden";
  }

  @Public()
  @Post("webhook")
  async receiveWebhook(@Body() payload: any) {
    const entry = payload?.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const phoneNumberId = change?.metadata?.phone_number_id;
    const message = change?.messages?.[0];
    if (!phoneNumberId || !message) return { received: true };

    const integration = await this.prisma.businessIntegration.findFirst({
      where: { whatsappPhoneNumberId: phoneNumberId },
    });
    if (!integration) return { received: true };

    const fromPhone = message.from;
    const text = message.text?.body ?? "[unsupported message type]";

    await this.whatsappService.logInboundMessage(integration.businessId, fromPhone, text, message.id);

    const client = await this.prisma.client.findFirst({
      where: { businessId: integration.businessId, phone: fromPhone },
    });
    if (client) {
      await this.prisma.communicationEntry.create({
        data: { clientId: client.id, channel: "WHATSAPP", direction: "INBOUND", message: text },
      });
    }

    return { received: true };
  }

  @RequirePermissions(Permission.MANAGE_CLIENTS)
  @Get("conversations/:phone")
  getConversation(@CurrentBusinessId() businessId: string, @Param("phone") phone: string) {
    return this.whatsappService.getConversation(businessId, phone);
  }

  @RequirePermissions(Permission.MANAGE_CLIENTS)
  @Post("send")
  send(@CurrentBusinessId() businessId: string, @Body() dto: SendMessageDto) {
    return this.whatsappService.sendTextMessage(businessId, dto.clientPhone, dto.message);
  }
}
