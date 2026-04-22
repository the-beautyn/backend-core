import { ApiProperty } from '@nestjs/swagger';

export class OAuthResponseDto {
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
    description: 'Whether this is the first time this user signed in (new account created)',
  })
  is_new_user: boolean;

  @ApiProperty({
    example: true,
    description: 'Whether phone OTP verification is required before the user can proceed',
  })
  phone_verification_required: boolean;
}
