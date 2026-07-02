import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

export class QuotationLineItemDto {
  @IsOptional() @IsString() serviceId?: string;
  @IsString() description!: string;
  @IsNumber() @Min(0.01) quantity!: number;
  @IsNumber() @Min(0) unitPrice!: number;
  @IsOptional() @IsNumber() @Min(0) taxRate?: number;
  @IsOptional() @IsNumber() @Min(0) discountPercent?: number;
}

export class CreateQuotationDto {
  @IsString() clientId!: string;
  @IsString() @MinLength(2) title!: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotationLineItemDto)
  items!: QuotationLineItemDto[];
  @IsOptional() @IsNumber() @Min(0) depositPercent?: number;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsString() notes?: string;
}

export class ApproveQuotationDto {
  @IsString() signatureName!: string;
  @IsOptional() @IsString() signatureImageUrl?: string;
}

export class DeclineQuotationDto {
  @IsOptional() @IsString() reason?: string;
}
