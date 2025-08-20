import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsString,
  IsInt,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ServicesSyncCategoryDto {
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

class ServicesSyncServiceDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  crm_external_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  category_external_id?: string | null;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsInt()
  duration_minutes!: number;

  @ApiProperty()
  @IsInt()
  price_cents!: number;

  @ApiProperty()
  @IsString()
  currency!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class ServicesSyncDto {
  @ApiProperty()
  @IsUUID()
  salon_id!: string;

  @ApiProperty({ type: [ServicesSyncCategoryDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ServicesSyncCategoryDto)
  categories?: ServicesSyncCategoryDto[];

  @ApiProperty({ type: [ServicesSyncServiceDto] })
  @ValidateNested({ each: true })
  @Type(() => ServicesSyncServiceDto)
  services!: ServicesSyncServiceDto[];
}

export { ServicesSyncCategoryDto, ServicesSyncServiceDto };
