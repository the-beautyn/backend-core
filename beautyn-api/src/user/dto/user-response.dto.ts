import { ApiProperty } from '@nestjs/swagger';
import { UserRole, AuthProvider } from '@prisma/client';
import { Expose } from 'class-transformer';

export class UserResponseDto {
  @ApiProperty({ example: '6f7c5b6e-1a2b-4c3d-8e9f-abcdef123456' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  @Expose()
  email!: string;

  @ApiProperty({ enum: ['client', 'owner', 'admin'], example: 'client' })
  @Expose()
  role!: UserRole;

  @ApiProperty({ example: 'John', nullable: true, required: false })
  @Expose()
  name!: string | null;

  @ApiProperty({ example: 'Doe', nullable: true, required: false })
  @Expose()
  second_name!: string | null;

  @ApiProperty({ example: '+12345678901', nullable: true, required: false })
  @Expose()
  phone!: string | null;

  @ApiProperty({ example: 'https://example.com/avatar.png', nullable: true, required: false })
  @Expose()
  avatar_url!: string | null;

  @ApiProperty({ enum: ['email', 'apple', 'google'], example: 'email' })
  @Expose()
  auth_provider!: AuthProvider;

  @ApiProperty({ example: false })
  @Expose()
  is_phone_verified!: boolean;

  @ApiProperty({ example: true })
  @Expose()
  is_profile_created!: boolean;

  @ApiProperty({ example: false })
  @Expose()
  is_onboarding_completed!: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @Expose()
  created_at!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @Expose()
  updated_at!: Date;
}
