import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class SelectBusinessDto {
  @IsString()
  preAuthToken!: string;

  @IsString()
  businessId!: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}
