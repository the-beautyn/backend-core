import { ApiProperty } from '@nestjs/swagger';

export class PublicWorkerDto {
  @ApiProperty({ example: 'wkr_01J0ZB1XY8A9W3KZ9Q2N7SDF4T' })
  id!: string;

  @ApiProperty({ example: 'Alice' })
  firstName!: string;

  @ApiProperty({ example: 'Brown' })
  lastName!: string;

  @ApiProperty({ required: false, nullable: true, example: 'Hair Stylist' })
  position?: string | null;

  @ApiProperty({ required: false, nullable: true, example: 'Expert in color corrections' })
  description?: string | null;

  @ApiProperty({ required: false, nullable: true, example: 'https://example.com/photo.jpg' })
  photoUrl?: string | null;
}
