import { IsOptional, IsString, MinLength } from "class-validator";

export class QuoteFromConversationDto {
  @IsOptional() @IsString() clientId?: string;
  @IsString() @MinLength(20) conversationText!: string;
}

export class InvoiceDescriptionDto {
  @IsString() serviceName!: string;
  @IsOptional() @IsString() context?: string;
}
