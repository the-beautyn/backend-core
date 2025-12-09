import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { SortOptionEnum } from '../enums/sort-option.enum';
import type { LocationType } from '../enums/location-type.enum';

export class SearchViewportDto {
  @ApiPropertyOptional()
  @Type(() => Number)
  @IsNumber()
  neLat!: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsNumber()
  neLng!: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsNumber()
  swLat!: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsNumber()
  swLng!: number;
}

export class SearchRequestDto {
  @ApiPropertyOptional({ description: 'Free text query' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ description: 'Latitude of search center' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  centerLat?: number;

  @ApiPropertyOptional({ description: 'Longitude of search center' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  centerLng?: number;

  @ApiPropertyOptional({ enum: ['city', 'neighborhood', 'address', 'poi', 'unknown'] })
  @IsOptional()
  @IsString()
  locationType?: LocationType;

  @ApiPropertyOptional({ type: SearchViewportDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SearchViewportDto)
  viewport?: SearchViewportDto;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ description: 'HH:mm' })
  @IsOptional()
  @IsString()
  time?: string;

  @ApiPropertyOptional({ description: 'Minimum price in main currency units' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceMin?: number;

  @ApiPropertyOptional({ description: 'Maximum price in main currency units' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceMax?: number;

  @ApiPropertyOptional({ type: [String], description: 'Canonical AppCategory IDs' })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    }
    return undefined;
  })
  @IsString({ each: true })
  appCategoryIds?: string[];

  @ApiPropertyOptional({ enum: SortOptionEnum })
  @IsOptional()
  @IsEnum(SortOptionEnum)
  sortBy?: SortOptionEnum;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
