import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SavedSalonItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  salonId!: string;

  @ApiProperty()
  salonName!: string;

  @ApiPropertyOptional({ nullable: true })
  coverImageUrl?: string | null;

  @ApiPropertyOptional({ nullable: true })
  addressLine?: string | null;

  @ApiPropertyOptional({ nullable: true })
  city?: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  ratingAvg?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  ratingCount?: number | null;

  @ApiProperty()
  savedAt!: string;
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
