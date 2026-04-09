import { IsEmail, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Registered email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Str0ngP@ssw0rd',
    description: 'User password',
  })
  @MinLength(8)
  @MaxLength(50)
  @Matches(/^[\x20-\x7E]+$/, {
    message: 'password must contain only Latin letters, digits, and special characters',
  })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'password must contain at least one uppercase letter, one lowercase letter, and one digit',
  })
  password: string;
}
