import { ApiProperty } from '@nestjs/swagger';

export class WorkerDto {
  @ApiProperty({ example: 'wkr_01J0ZB1XY8A9W3KZ9Q2N7SDF4T' })
  id!: string;

  @ApiProperty({ required: false, nullable: true, example: 'crm_123' })
  crm_worker_id?: string | null;

  @ApiProperty({ example: 'salon_01HXYZ...' })
  salon_id!: string;

  @ApiProperty({ example: 'Alice' })
  first_name!: string;

  @ApiProperty({ example: 'Brown' })
  last_name!: string;

  @ApiProperty({ example: 'Hair Stylist', required: false, nullable: true })
  position?: string | null;

  @ApiProperty({ example: 'Expert in color corrections', required: false, nullable: true })
  description?: string | null;

  @ApiProperty({ example: 'alice@example.com', nullable: true, required: false })
  email?: string | null;

  @ApiProperty({ example: '+12025550123', nullable: true, required: false })
  phone?: string | null;

  @ApiProperty({ example: 'https://example.com/photo.jpg', nullable: true, required: false })
  photo_url?: string | null;

  @ApiProperty({ type: String, isArray: true, required: false })
  service_ids?: string[];

  @ApiProperty({ example: true })
  is_active!: boolean;

  @ApiProperty()
  created_at!: Date;

  @ApiProperty()
  updated_at!: Date;
}
