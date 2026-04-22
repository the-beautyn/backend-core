import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SavedSalonItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  salon_id!: string;

  @ApiProperty()
  salon_name!: string;

  @ApiPropertyOptional({ nullable: true })
  cover_image_url?: string | null;

  @ApiPropertyOptional({ nullable: true })
  address_line?: string | null;

  @ApiPropertyOptional({ nullable: true })
  city?: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  rating_avg?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  rating_count?: number | null;

  @ApiProperty()
  saved_at!: string;
}

export class SavedSalonListResponseDto {
  @ApiProperty({ type: [SavedSalonItemDto] })
  items!: SavedSalonItemDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}
