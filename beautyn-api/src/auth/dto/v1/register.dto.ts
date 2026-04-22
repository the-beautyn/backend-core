import { IsEmail, MinLength, MaxLength, Matches, IsIn, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_CHARSET,
  PASSWORD_COMPOSITION,
} from './password-policy';

// Roles that can be self-assigned during public registration
export const REGISTERABLE_ROLES: UserRole[] = [UserRole.client, UserRole.owner];
export type RegisterRole = (typeof REGISTERABLE_ROLES)[number];

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
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(PASSWORD_CHARSET, {
    message: 'password must contain only Latin letters, digits, and special characters (no spaces)',
  })
  @Matches(PASSWORD_COMPOSITION, {
    message:
      'password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character',
  })
  password: string;

  @ApiProperty({
    example: 'client',
    description: "User role, either 'client' or 'owner'",
    enum: REGISTERABLE_ROLES,
  })
  @IsIn(REGISTERABLE_ROLES)
  role: RegisterRole;

  @ApiProperty({ example: 'John', description: 'First name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  secondName: string;

}
