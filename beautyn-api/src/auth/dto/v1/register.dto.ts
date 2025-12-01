import { IsEmail, MinLength, MaxLength, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

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
  @MinLength(8)
  @MaxLength(50)
  password: string;

  @ApiProperty({
    example: 'client',
    description: "User role, either 'client' or 'owner'",
    enum: REGISTERABLE_ROLES,
  })
  @IsIn(REGISTERABLE_ROLES)
  role: RegisterRole;
}
