import { ApiProperty } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ format: 'uuid' })
  salon_id!: string;

  @ApiProperty({ required: true })
  crm_category_id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false, nullable: true })
  color!: string | null;

  @ApiProperty({ required: false, nullable: true })
  sort_order!: number | null;

  @ApiProperty({ type: String, isArray: true })
  service_ids!: string[];

  @ApiProperty()
  created_at!: Date;

  @ApiProperty()
  updated_at!: Date;
}

export class CategoryListResponseDto {
  @ApiProperty({ type: CategoryResponseDto, isArray: true })
  items!: CategoryResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}
