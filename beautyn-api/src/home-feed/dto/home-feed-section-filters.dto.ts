import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SortOptionEnum } from '../../search/enums/sort-option.enum';

export class HomeFeedSectionFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by AppCategory ID' })
  @IsOptional()
  @IsUUID()
  appCategoryId?: string;

  @ApiPropertyOptional({ enum: SortOptionEnum, description: 'Sort order for salons' })
  @IsOptional()
  @IsEnum(SortOptionEnum)
  sortBy?: SortOptionEnum;

  @ApiPropertyOptional({ description: 'Geo radius in km (requires lat/lon from client)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(100)
  radiusKm?: number;

  @ApiPropertyOptional({ description: 'Minimum price in main currency units' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMin?: number;

  @ApiPropertyOptional({ description: 'Maximum price in main currency units' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMax?: number;

  @ApiPropertyOptional({ description: 'Free text search (salon name, city, address)' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ description: 'Filter salons open on current day of week' })
  @IsOptional()
  @IsBoolean()
  openToday?: boolean;
}
