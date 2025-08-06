import { MinLength, MaxLength, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'reset-token-123',
    description: 'Password reset token',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    example: 'N3wP@ssword!',
    description: 'New account password',
  })
  @MinLength(8)
  @MaxLength(50)
  newPassword: string;
}
