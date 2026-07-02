import { PartialType } from "@nestjs/mapped-types";
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { ExpenseCategory } from "@kazihq/shared";

export class CreateExpenseDto {
  @IsEnum(ExpenseCategory) category!: ExpenseCategory;
  @IsString() description!: string;
  @IsNumber() @Min(0.01) amount!: number;
  @IsOptional() @IsString() receiptUrl?: string;
  @IsDateString() incurredAt!: string;
}

export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}
