import { IsNumber, IsOptional, IsString, Matches, Min } from "class-validator";

export class StkPushDto {
  @IsOptional() @IsString() invoiceId?: string;
  @IsOptional() @IsString() bookingId?: string;
  @Matches(/^2547\d{8}$|^2541\d{8}$/, { message: "Phone must be in format 2547XXXXXXXX" })
  phoneNumber!: string;
  @IsNumber() @Min(1) amount!: number;
  @IsString() accountReference!: string;
}

export class StripeCheckoutDto {
  @IsString() invoiceId!: string;
  @IsString() successUrl!: string;
  @IsString() cancelUrl!: string;
}

export class CreatePaymentLinkDto {
  @IsString() invoiceId!: string;
}

export class RecordManualPaymentDto {
  @IsOptional() @IsString() invoiceId?: string;
  @IsOptional() @IsString() bookingId?: string;
  @IsOptional() @IsString() clientId?: string;
  @IsNumber() @Min(0.01) amount!: number;
  @IsString() method!: string; // BANK_TRANSFER | CASH
}
