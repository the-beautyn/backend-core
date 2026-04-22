import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
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
  // Do NOT apply the registration password policy here — existing users
  // may have valid passwords that don't match a future tightened policy,
  // and enforcing format on login would lock them out. Supabase returns
  // 401 for wrong credentials regardless.
  @IsString()
  @IsNotEmpty()
  password: string;
}
