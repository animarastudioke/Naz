import { PartialType } from "@nestjs/mapped-types";
import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class CreateClientDto {
  @IsString() @MinLength(2) fullName!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsString() phone!: string;
  @IsOptional() @IsString() whatsappNumber?: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @Type(() => String) tags?: string[];
  @IsOptional() @IsString() segment?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() source?: string;
}

export class UpdateClientDto extends PartialType(CreateClientDto) {}

export class AddCommunicationDto {
  @IsString() channel!: string;
  @IsString() direction!: "INBOUND" | "OUTBOUND";
  @IsOptional() @IsString() subject?: string;
  @IsString() message!: string;
}
