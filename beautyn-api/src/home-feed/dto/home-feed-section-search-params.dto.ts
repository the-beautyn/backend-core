import { ApiPropertyOptional } from '@nestjs/swagger';
import { SortOptionEnum } from '../../search/enums/sort-option.enum';

/**
 * The public-search-shaped parameters a client can replay on POST /search
 * to reproduce a home feed section. Derived from the section's stored
 * filters; page/limit/radius are omitted — the client owns pagination and
 * viewport.
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
