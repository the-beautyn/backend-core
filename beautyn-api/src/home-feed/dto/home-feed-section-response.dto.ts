import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HomeFeedSectionFiltersDto } from './home-feed-section-filters.dto';

export class HomeFeedSectionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  emoji?: string | null;

  @ApiProperty()
  sort_order!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  is_active!: boolean;

  @ApiPropertyOptional({ type: HomeFeedSectionFiltersDto, nullable: true })
  filters?: HomeFeedSectionFiltersDto | null;

  @ApiProperty()
  created_at!: string;

  @ApiProperty()
  updated_at!: string;
}
