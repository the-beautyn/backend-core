import { ApiProperty } from '@nestjs/swagger';

export class WorkerDto {
  @ApiProperty({ example: 'wkr_01J0ZB1XY8A9W3KZ9Q2N7SDF4T' })
  id!: string;

  @ApiProperty({ example: 'salon_01HXYZ...' })
  salon_id!: string;

  @ApiProperty({ example: 'Alice' })
  first_name!: string;

  @ApiProperty({ example: 'Brown' })
  last_name!: string;

  @ApiProperty({ example: 'master', nullable: true, required: false })
  role?: string | null;

  @ApiProperty({ example: 'alice@example.com', nullable: true, required: false })
  email?: string | null;

  @ApiProperty({ example: '+12025550123', nullable: true, required: false })
  phone?: string | null;

  @ApiProperty({ example: 'https://example.com/photo.jpg', nullable: true, required: false })
  photo_url?: string | null;

  @ApiProperty({ example: true })
  is_active!: boolean;

  @ApiProperty({ type: [String], required: false })
  service_ids?: string[];
}
