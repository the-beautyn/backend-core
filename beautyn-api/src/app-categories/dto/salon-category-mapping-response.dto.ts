import { ApiProperty } from '@nestjs/swagger';

export class SalonCategoryMappingResponseDto {
  @ApiProperty()
  salon_category_id!: string;

  @ApiProperty({ required: false, nullable: true })
  app_category_id!: string | null;

  @ApiProperty()
  auto_matched!: boolean;

  @ApiProperty({ required: false, nullable: true })
  confidence!: number | null;

  @ApiProperty()
  updated_by!: 'system' | 'owner';

  @ApiProperty()
  updated_at!: Date;
}

export class SalonAppCategoryMappingDto {
  @ApiProperty()
  salon_id!: string;

  @ApiProperty()
  salon_name!: string;

  @ApiProperty()
  salon_category_id!: string;

  @ApiProperty({ required: false, nullable: true })
  app_category_id!: string | null;

  @ApiProperty({ required: false, nullable: true })
  app_category_name!: string | null;
}
