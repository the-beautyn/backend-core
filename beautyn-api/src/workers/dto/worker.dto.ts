import { ApiProperty } from '@nestjs/swagger';

export class WorkerDto {
  @ApiProperty({ example: 'wkr_01J0ZB1XY8A9W3KZ9Q2N7SDF4T' })
  id!: string;

  @ApiProperty({ required: false, nullable: true, example: 'crm_123' })
  crmWorkerId?: string | null;

  @ApiProperty({ example: 'salon_01HXYZ...' })
  salonId!: string;

  @ApiProperty({ example: 'Alice' })
  firstName!: string;

  @ApiProperty({ example: 'Brown' })
  lastName!: string;

  @ApiProperty({ example: 'Hair Stylist', required: false, nullable: true })
  position?: string | null;

  @ApiProperty({ example: 'Expert in color corrections', required: false, nullable: true })
  description?: string | null;

  @ApiProperty({ example: 'alice@example.com', nullable: true, required: false })
  email?: string | null;

  @ApiProperty({ example: '+12025550123', nullable: true, required: false })
  phone?: string | null;

  @ApiProperty({ example: 'https://example.com/photo.jpg', nullable: true, required: false })
  photoUrl?: string | null;

  @ApiProperty({ type: String, isArray: true, required: false })
  serviceIds?: string[];

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
