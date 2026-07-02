import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { nanoid } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";

interface MpesaCredentials {
  shortcode: string;
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  env: string;
}

export interface StkPushResult {
  merchantRequestId: string;
  checkoutRequestId: string;
  responseDescription: string;
  isDryRun: boolean;
}

/** Safaricom Daraja API client — STK Push (Lipa na M-Pesa Online) scoped per business. */
@Injectable()
export class MpesaService {
  private readonly logger = new Logger(MpesaService.name);

  constructor(private readonly prisma: PrismaService) {}

  private baseUrl(env: string) {
    return env === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
  }

  private async getCredentials(businessId: string): Promise<MpesaCredentials | null> {
    const integration = await this.prisma.businessIntegration.findUnique({ where: { businessId } });
    if (!integration?.mpesaShortcode || !integration?.mpesaConsumerKey || !integration?.mpesaConsumerSecret || !integration?.mpesaPasskey) {
      return null;
    }
    return {
      shortcode: integration.mpesaShortcode,
      consumerKey: integration.mpesaConsumerKey,
      consumerSecret: integration.mpesaConsumerSecret,
      passkey: integration.mpesaPasskey,
      env: integration.mpesaEnv,
    };
  }

  private async getAccessToken(creds: MpesaCredentials): Promise<string> {
    const auth = Buffer.from(`${creds.consumerKey}:${creds.consumerSecret}`).toString("base64");
    const { data } = await axios.get(`${this.baseUrl(creds.env)}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    return data.access_token;
  }

  private timestamp(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  }

  async stkPush(businessId: string, phoneNumber: string, amount: number, accountReference: string): Promise<StkPushResult> {
    const creds = await this.getCredentials(businessId);

    if (!creds) {
      this.logger.log(
        `[mpesa:dry-run] No Daraja credentials configured — simulating STK push of ${amount} to ${phoneNumber} (ref: ${accountReference})`
      );
      return {
        merchantRequestId: `dryrun-${nanoid(10)}`,
        checkoutRequestId: `dryrun-${nanoid(10)}`,
        responseDescription: "Simulated STK push — no Daraja credentials configured for this business",
        isDryRun: true,
      };
    }

    const accessToken = await this.getAccessToken(creds);
    const timestamp = this.timestamp();
    const password = Buffer.from(`${creds.shortcode}${creds.passkey}${timestamp}`).toString("base64");
    const callbackBase = process.env.MPESA_CALLBACK_BASE_URL ?? "";

    try {
      const { data } = await axios.post(
        `${this.baseUrl(creds.env)}/mpesa/stkpush/v1/processrequest`,
        {
          BusinessShortCode: creds.shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: Math.round(amount),
          PartyA: phoneNumber,
          PartyB: creds.shortcode,
          PhoneNumber: phoneNumber,
          CallBackURL: `${callbackBase}/api/v1/payments/mpesa/callback`,
          AccountReference: accountReference.slice(0, 12),
          TransactionDesc: "Payment",
        },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      return {
        merchantRequestId: data.MerchantRequestID as string,
        checkoutRequestId: data.CheckoutRequestID as string,
        responseDescription: data.ResponseDescription as string,
        isDryRun: false,
      };
    } catch (error: any) {
      this.logger.error("M-Pesa STK push failed", error?.response?.data ?? error);
      throw new BadRequestException(
        error?.response?.data?.errorMessage ?? "Failed to initiate M-Pesa STK push. Please try again."
      );
    }
  }
}
