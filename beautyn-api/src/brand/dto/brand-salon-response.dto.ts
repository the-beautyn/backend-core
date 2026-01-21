import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BrandSalonResponseDto {
  @ApiProperty()
  salon_id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  address?: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  crm_provider?: string;

  @ApiPropertyOptional()
  crm_external_id?: string;
}
