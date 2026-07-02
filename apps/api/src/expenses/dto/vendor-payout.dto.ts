import { IsDateString, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateVendorPayoutDto {
  @IsOptional() @IsString() vendorId?: string;
  @IsOptional() @IsString() vendorName?: string;
  @IsOptional() @IsString() bookingId?: string;
  @IsString() description!: string;
  @IsNumber() @Min(0.01) amount!: number;
  @IsOptional() @IsDateString() dueDate?: string;
}
