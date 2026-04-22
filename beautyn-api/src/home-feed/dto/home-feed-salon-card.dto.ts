import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HomeFeedSalonCardDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  cover_image_url?: string | null;

  @ApiPropertyOptional()
  address_line?: string | null;

  @ApiPropertyOptional()
  city?: string | null;

  @ApiPropertyOptional()
  rating_avg?: number | null;

  @ApiPropertyOptional()
  rating_count?: number | null;

  @ApiPropertyOptional()
  distance_km?: number | null;

  @ApiPropertyOptional()
  is_saved?: boolean;
}
