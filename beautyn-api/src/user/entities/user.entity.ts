import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class User {
  @ApiProperty({ example: '6f7c5b6e-1a2b-4c3d-8e9f-abcdef123456' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ enum: ['client', 'owner', 'admin'], example: 'client' })
  role!: UserRole;

  @ApiProperty({ example: 'John', nullable: true, required: false })
  name!: string | null;

  @ApiProperty({ example: 'Doe', nullable: true, required: false })
  second_name!: string | null;

  @ApiProperty({ example: '+12345678901', nullable: true, required: false })
  phone!: string | null;

  @ApiProperty({ example: 'https://example.com/avatar.png', nullable: true, required: false })
  avatar_url!: string | null;

  @ApiProperty({ example: false })
  is_profile_created!: boolean;

  @ApiProperty({ example: false })
  is_onboarding_completed!: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  created_at!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updated_at!: Date;
}
