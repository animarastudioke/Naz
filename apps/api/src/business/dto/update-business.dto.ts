import { IsBoolean, IsHexColor, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class UpdateBusinessDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsHexColor() brandColor?: string;
  @IsOptional() @IsString() kraPin?: string;
  @IsOptional() @IsBoolean() vatRegistered?: boolean;
  @IsOptional() @IsNumber() @Min(0) @Max(100) vatRate?: number;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsString() invoicePrefix?: string;
  @IsOptional() @IsString() quotePrefix?: string;
  @IsOptional() @IsString() currency?: string;
}

export class CreateBranchDto {
  @IsString() name!: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() phone?: string;
}

export class UpdateIntegrationDto {
  @IsOptional() @IsString() mpesaShortcode?: string;
  @IsOptional() @IsString() mpesaConsumerKey?: string;
  @IsOptional() @IsString() mpesaConsumerSecret?: string;
  @IsOptional() @IsString() mpesaPasskey?: string;
  @IsOptional() @IsString() mpesaEnv?: string;
  @IsOptional() @IsString() stripeAccountId?: string;
  @IsOptional() @IsString() stripeSecretKey?: string;
  @IsOptional() @IsString() whatsappPhoneNumberId?: string;
  @IsOptional() @IsString() whatsappAccessToken?: string;
  @IsOptional() @IsString() whatsappBusinessId?: string;
}
