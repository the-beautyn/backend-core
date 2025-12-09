import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchHistoryItemDto {
  @ApiProperty({ description: 'History row ID' })
  id!: string;

  @ApiProperty()
  salonId!: string;

  @ApiProperty()
  salonName!: string;

  @ApiProperty()
  city!: string;

  @ApiPropertyOptional()
  logoUrl?: string;

  @ApiProperty({ description: 'ISO timestamp of the last visit' })
  lastSearchedAt!: string;
}
