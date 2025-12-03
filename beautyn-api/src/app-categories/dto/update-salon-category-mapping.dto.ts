import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateSalonCategoryMappingDto {
  @ApiProperty({ required: false, description: 'App category id to map to; null to unmap' })
  @IsOptional()
  @IsUUID('4')
  appCategoryId?: string | null;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  autoMatched?: boolean;
}
