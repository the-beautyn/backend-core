import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsInt, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CategorySyncItemDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  crm_external_id?: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  sort_order?: number;
}

export class CategoriesSyncDto {
  @ApiProperty()
  @IsString()
  salon_id!: string;

  @ApiProperty({ type: [CategorySyncItemDto] })
  @ValidateNested({ each: true })
  @Type(() => CategorySyncItemDto)
  categories!: CategorySyncItemDto[];
}


