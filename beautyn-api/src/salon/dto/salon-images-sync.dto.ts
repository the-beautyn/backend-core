import { IsArray, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SalonImageSyncItemDto {
  @IsString()
  image_url!: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsInt()
  sort_order?: number;
}

export class SalonImagesSyncDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalonImageSyncItemDto)
  items!: SalonImageSyncItemDto[];
}
