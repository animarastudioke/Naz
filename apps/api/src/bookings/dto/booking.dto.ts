import { IsDateString, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateBookingDto {
  @IsString() clientId!: string;
  @IsString() serviceId!: string;
  @IsDateString() startAt!: string;
  @IsDateString() endAt!: string;
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() staffId?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsNumber() @Min(0) depositAmount?: number;
}

export class UpdateBookingStatusDto {
  @IsString() status!: string;
  @IsOptional() @IsString() cancellationReason?: string;
}

export class RescheduleBookingDto {
  @IsDateString() startAt!: string;
  @IsDateString() endAt!: string;
}
