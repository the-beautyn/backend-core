import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchResponseDto {
  @ApiProperty()
  salon_id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  address!: string;

  @ApiPropertyOptional()
  rating?: number;

  @ApiPropertyOptional({ description: 'Distance in kilometers' })
  distance_km?: number;

  @ApiPropertyOptional()
  logo_url?: string;

  @ApiPropertyOptional()
  latitude?: number;

  @ApiPropertyOptional()
  longitude?: number;

  @ApiPropertyOptional()
  image_url?: string;
}

export class SearchResultDto {
  @ApiProperty({ type: [SearchResponseDto] })
  items!: SearchResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiPropertyOptional({ description: 'Extra geo metadata' })
  meta?: {
    effective_radius_km?: number;
    geo_source?: 'viewport' | 'center' | 'geoip' | 'none';
  };
}
