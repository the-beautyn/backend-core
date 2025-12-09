import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchHistory {
  @ApiProperty({ description: 'History entry ID' })
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  salonId!: string;

  @ApiPropertyOptional({ description: 'Last search query that led to this visit' })
  lastQuery?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
