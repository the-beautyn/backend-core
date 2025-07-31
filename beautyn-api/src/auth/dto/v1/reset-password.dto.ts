import { MinLength, MaxLength } from 'class-validator';

export class ResetPasswordDto {
  token: string;

  @MinLength(8)
  @MaxLength(50)
  newPassword: string;
}
