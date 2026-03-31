import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Length, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { HomeFeedSectionFiltersDto } from './home-feed-section-filters.dto';

export class CreateHomeFeedSectionDto {
  @ApiProperty({ description: 'Display hint for frontend (e.g. popular, category, nearMe)' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 32)
  type!: string;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @Length(1, 200)
  title!: string;

  @ApiPropertyOptional({ maxLength: 10 })
  @IsOptional()
  @IsString()
  @Length(1, 10)
  emoji?: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  sortOrder!: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Search filters configuration', type: HomeFeedSectionFiltersDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => HomeFeedSectionFiltersDto)
  filters?: HomeFeedSectionFiltersDto;
}
