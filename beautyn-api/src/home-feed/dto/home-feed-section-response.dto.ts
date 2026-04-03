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
  sortOrder!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional({ type: HomeFeedSectionFiltersDto, nullable: true })
  filters?: HomeFeedSectionFiltersDto | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
