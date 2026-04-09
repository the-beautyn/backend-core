import { ApiProperty } from '@nestjs/swagger';

export type EmailStatus = 'not_found' | 'password' | 'apple' | 'google';

export class CheckEmailResponseDto {
  @ApiProperty({
    example: 'password',
    enum: ['not_found', 'password', 'apple', 'google'],
    description:
      'not_found = email not registered, password = registered with email/password, apple/google = registered via OAuth',
  })
  status: EmailStatus;
}
