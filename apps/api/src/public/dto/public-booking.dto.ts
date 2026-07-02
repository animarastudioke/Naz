import { IsDateString, IsEmail, IsOptional, IsString } from "class-validator";

export class CreatePublicBookingDto {
  @IsString() serviceId!: string;
  @IsDateString() startAt!: string;
  @IsDateString() endAt!: string;
  @IsString() clientFullName!: string;
  @IsString() clientPhone!: string;
  @IsOptional() @IsEmail() clientEmail?: string;
  @IsOptional() @IsString() notes?: string;
}

export class RescheduleByTokenDto {
  @IsDateString() startAt!: string;
  @IsDateString() endAt!: string;
}
