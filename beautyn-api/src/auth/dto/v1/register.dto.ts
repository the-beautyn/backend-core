import { IsEmail, MinLength, MaxLength, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Str0ngP@ssw0rd',
    description: 'Desired account password',
  })
  @MinLength(8)
  @MaxLength(50)
  password: string;

  @ApiProperty({
    example: 'client',
    description: "User role, either 'client' or 'owner'",
  })
  @IsEnum(UserRole)
  role: UserRole;
}
