import { ApiProperty } from '@nestjs/swagger';

export class RegisterResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  access_token: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT refresh token',
  })
  refresh_token: string;

  @ApiProperty({
    example: 900,
    description: 'Expiration time in seconds',
  })
  expires_in: number;

  @ApiProperty({
    example: true,
    description: 'Whether phone OTP verification is required before the user can proceed',
  })
  phone_verification_required: boolean;
}
