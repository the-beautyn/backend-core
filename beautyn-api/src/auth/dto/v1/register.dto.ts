import { IsEmail, MinLength, MaxLength, IsEnum } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @MinLength(8)
  @MaxLength(50)
  password: string;

  @IsEnum(['client', 'owner'])
  role: string;
}
