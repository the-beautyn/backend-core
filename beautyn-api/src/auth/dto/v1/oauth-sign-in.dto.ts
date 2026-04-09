import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const OAUTH_PROVIDERS = ['apple', 'google'] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export class OAuthSignInDto {
  @ApiProperty({
    example: 'apple',
    enum: OAUTH_PROVIDERS,
    description: 'OAuth provider',
  })
  @IsIn(OAUTH_PROVIDERS)
  provider: OAuthProvider;

  @ApiProperty({
    example: 'eyJraWQiOiI...',
    description: 'ID token from the native mobile SDK (Apple/Google)',
  })
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @ApiPropertyOptional({
    description: 'Nonce used during Apple Sign-In for replay protection',
  })
  @IsOptional()
  @IsString()
  nonce?: string;

  @ApiPropertyOptional({
    example: 'John',
    description: 'First name (Apple only sends this on first sign-in)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: 'Doe',
    description: 'Last name (Apple only sends this on first sign-in)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  secondName?: string;
}
