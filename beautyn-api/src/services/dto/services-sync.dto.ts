import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsString,
  IsInt,
  IsBoolean,
  IsArray,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ServicesSyncServiceDto {
  @ApiProperty({ required: true })
  @IsNotEmpty()
  @IsString()
  crm_service_id!: string;

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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  duration?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  price?: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  sort_order?: number;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  worker_ids?: string[];
}

export class ServicesSyncDto {
  @ApiProperty()
  @IsUUID()
  salon_id!: string;

  @ApiProperty({ type: [ServicesSyncServiceDto] })
  @ValidateNested({ each: true })
  @Type(() => ServicesSyncServiceDto)
  services!: ServicesSyncServiceDto[];
}

export { ServicesSyncServiceDto };
