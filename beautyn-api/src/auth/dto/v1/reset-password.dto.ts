import { MinLength, MaxLength, Matches, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
  @MinLength(8)
  @MaxLength(50)
  @Matches(/^[\x20-\x7E]+$/, {
    message: 'new_password must contain only Latin letters, digits, and special characters',
  })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'new_password must contain at least one uppercase letter, one lowercase letter, and one digit',
  })
  new_password: string;
}
