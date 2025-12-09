import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchResponseDto {
  @ApiProperty()
  salonId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  address!: string;

  @ApiPropertyOptional()
  rating?: number;

  @ApiPropertyOptional({ description: 'Distance in kilometers' })
  distanceKm?: number;

  @ApiPropertyOptional()
  logoUrl?: string;

  @ApiPropertyOptional()
  latitude?: number;

  @ApiPropertyOptional()
  longitude?: number;

  @ApiPropertyOptional()
  imageUrl?: string;
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
    effectiveRadiusKm?: number;
    geoSource?: 'viewport' | 'center' | 'geoip' | 'none';
  };
}
