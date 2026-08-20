import { IsEmail, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const FORGOT_PASSWORD_CLIENTS = ['web-admin'] as const;
export type ForgotPasswordClient = (typeof FORGOT_PASSWORD_CLIENTS)[number];

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Account email for password recovery',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    enum: FORGOT_PASSWORD_CLIENTS,
    example: 'web-admin',
    description:
      'Requesting client. "web-admin" makes the reset email link to the owner web panel instead of the mobile universal link; omit for the mobile app.',
  })
  @IsOptional()
  @IsIn(FORGOT_PASSWORD_CLIENTS)
  client?: ForgotPasswordClient;
}
