import { ApiPropertyOptional } from '@nestjs/swagger';
import { SortOptionEnum } from '../../search/enums/sort-option.enum';

/**
 * The public-search-shaped parameters of a home feed section. Keys follow
 * the response convention (snake_case); the client maps them onto the
 * camelCase SearchRequestDto fields when replaying the section as a
 * POST /search. Derived from the section's stored filters; page/limit/radius
 * are omitted — the client owns pagination and viewport.
 */
export class HomeFeedSectionSearchParamsDto {
  @ApiPropertyOptional()
  query?: string;

  @ApiPropertyOptional({ type: [String] })
  app_category_ids?: string[];

  @ApiPropertyOptional({ enum: SortOptionEnum })
  sort_by?: SortOptionEnum;

  @ApiPropertyOptional()
  price_min?: number;

  @ApiPropertyOptional()
  price_max?: number;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD' })
  date?: string;
}
