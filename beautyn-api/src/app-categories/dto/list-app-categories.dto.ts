import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ToBoolean } from '../../shared/decorators/to-boolean.decorator';

const MAX_LIMIT = 100;

export class ListAppCategoriesQueryDto {
  @ApiProperty({ required: false, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false, minimum: 1, maximum: MAX_LIMIT, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  onlyActive?: boolean;
}

export const APP_CATEGORY_MAX_LIMIT = MAX_LIMIT;
