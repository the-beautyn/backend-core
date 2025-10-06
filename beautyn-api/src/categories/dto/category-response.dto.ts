import { ApiProperty } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ format: 'uuid' })
  salonId!: string;

  @ApiProperty({ required: false, nullable: true })
  crmCategoryId!: string | null;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false, nullable: true })
  color!: string | null;

  @ApiProperty({ required: false, nullable: true })
  sortOrder!: number | null;

  @ApiProperty({ type: String, isArray: true })
  serviceIds!: string[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
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
