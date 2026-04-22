import { MinLength, MaxLength, Matches, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_CHARSET,
  PASSWORD_COMPOSITION,
} from './password-policy';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'reset-token-123',
    description: 'Password reset token',
  })
  @IsString()
  @IsNotEmpty()
  otp_token: string;

  @ApiProperty({
    example: 'N3wP@ssword!',
    description: 'New account password',
  })
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(PASSWORD_CHARSET, {
    message: 'new_password must contain only Latin letters, digits, and special characters (no spaces)',
  })
  @Matches(PASSWORD_COMPOSITION, {
    message:
      'new_password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character',
  })
  new_password: string;
}
