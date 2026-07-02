import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { RecurringInterval } from "../invoices.constants";

export class InvoiceLineItemDto {
  @IsOptional() @IsString() serviceId?: string;
  @IsString() description!: string;
  @IsNumber() @Min(0.01) quantity!: number;
  @IsNumber() @Min(0) unitPrice!: number;
  @IsOptional() @IsNumber() @Min(0) taxRate?: number;
  @IsOptional() @IsNumber() @Min(0) discountPercent?: number;
}

export class CreateInvoiceDto {
  @IsString() clientId!: string;
  @IsOptional() @IsString() bookingId?: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemDto)
  items!: InvoiceLineItemDto[];
  @IsDateString() dueDate!: string;
  @IsOptional() @IsEnum(RecurringInterval) recurringInterval?: RecurringInterval;
  @IsOptional() @IsString() notes?: string;
}

export class CreateCreditNoteDto {
  @IsNumber() @Min(0.01) amount!: number;
  @IsOptional() @IsString() reason?: string;
}
