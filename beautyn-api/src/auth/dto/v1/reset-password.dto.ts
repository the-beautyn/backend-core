import { MinLength, MaxLength, IsString, IsNotEmpty } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @MinLength(8)
  @MaxLength(50)
  newPassword: string;
}
