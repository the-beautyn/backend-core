import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HomeFeedSalonCardDto } from './home-feed-salon-card.dto';
import { HomeFeedSectionSearchParamsDto } from './home-feed-section-search-params.dto';

export class HomeFeedSectionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  emoji?: string | null;

  @ApiProperty({ type: [HomeFeedSalonCardDto] })
  items!: HomeFeedSalonCardDto[];

  @ApiProperty({ type: HomeFeedSectionSearchParamsDto })
  search_params!: HomeFeedSectionSearchParamsDto;
}
