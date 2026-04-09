import { ApiProperty } from '@nestjs/swagger';

export class OAuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  accessToken: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT refresh token',
  })
  refreshToken: string;

  @ApiProperty({
    example: 900,
    description: 'Expiration time in seconds',
  })
  expiresIn: number;

  @ApiProperty({
    example: true,
    description: 'Whether this is the first time this user signed in (new account created)',
  })
  isNewUser: boolean;

  @ApiProperty({
    example: true,
    description: 'Whether phone OTP verification is required before the user can proceed',
  })
  phoneVerificationRequired: boolean;
}
