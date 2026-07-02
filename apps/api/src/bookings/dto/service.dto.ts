import { PartialType } from "@nestjs/mapped-types";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator";

export class CreateServiceDto {
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() category?: string;
  @IsInt() @Min(5) durationMins!: number;
  @IsNumber() @Min(0) price!: number;
  @IsOptional() @IsNumber() @Min(0) taxRate?: number;
  @IsOptional() @IsBoolean() requiresDeposit?: boolean;
  @IsOptional() @IsNumber() @Min(0) depositPercent?: number;
}

export class UpdateServiceDto extends PartialType(CreateServiceDto) {}

class PackageItemDto {
  @IsString() serviceId!: string;
  @IsInt() @Min(1) quantity!: number;
}

export class CreateServicePackageDto {
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() eventType?: string;
  @IsNumber() @Min(0) price!: number;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackageItemDto)
  items!: PackageItemDto[];
}
