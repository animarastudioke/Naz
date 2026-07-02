import { IsEmail, IsEnum, IsOptional, IsString } from "class-validator";
import { StaffRole } from "@kazihq/shared";

export class InviteUserDto {
  @IsEmail() email!: string;
  @IsString() fullName!: string;
  @IsEnum(StaffRole) role!: StaffRole;
  @IsOptional() @IsString() branchId?: string;
}

export class UpdateMembershipDto {
  @IsOptional() @IsEnum(StaffRole) role?: StaffRole;
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() isActive?: boolean;
}
