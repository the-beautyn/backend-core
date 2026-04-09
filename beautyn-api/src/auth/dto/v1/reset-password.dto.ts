import { MinLength, MaxLength, Matches, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'reset-token-123',
    description: 'Password reset token',
  })
  @IsString()
  @IsNotEmpty()
  otpToken: string;

  @ApiProperty({
    example: 'N3wP@ssword!',
    description: 'New account password',
  })
  @MinLength(8)
  @MaxLength(50)
  @Matches(/^[\x20-\x7E]+$/, {
    message: 'newPassword must contain only Latin letters, digits, and special characters',
  })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'newPassword must contain at least one uppercase letter, one lowercase letter, and one digit',
  })
  newPassword: string;
}
