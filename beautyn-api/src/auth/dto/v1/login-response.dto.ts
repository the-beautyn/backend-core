import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({
    example: '<jwt>',
    description: 'JWT access token',
  })
  accessToken: string;

  @ApiProperty({
    example: 900,
    description: 'Expiration time in seconds',
  })
  expiresIn: number;
}
