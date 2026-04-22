import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckEmailDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address to check',
  })
  @IsEmail()
  email: string;
}
