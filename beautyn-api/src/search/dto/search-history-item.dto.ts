import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchHistoryItemDto {
  @ApiProperty({ description: 'History row ID' })
  id!: string;

  @ApiProperty()
  salon_id!: string;

  @ApiProperty()
  salon_name!: string;

  @ApiProperty()
  city!: string;

  @ApiPropertyOptional()
  logo_url?: string;

  @ApiPropertyOptional({ description: 'Salon latitude — lets clients zoom the map to the salon' })
  latitude?: number;

  @ApiPropertyOptional({ description: 'Salon longitude — lets clients zoom the map to the salon' })
  longitude?: number;

  @ApiProperty({ description: 'ISO timestamp of the last visit' })
  last_searched_at!: string;
}
