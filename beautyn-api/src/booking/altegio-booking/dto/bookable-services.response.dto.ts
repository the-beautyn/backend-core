import { ApiProperty } from '@nestjs/swagger';

export class BookableServiceCategoryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class BookableServiceDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ required: false, nullable: true })
  category_id!: string | null;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  price!: number;

  @ApiProperty({ required: false, nullable: true })
  duration_sec!: number | null;

  @ApiProperty()
  is_available!: boolean;
}

export class BookableServicesResponseDto {
  @ApiProperty({ type: [BookableServiceCategoryDto] })
  categories!: BookableServiceCategoryDto[];

  @ApiProperty({ type: [BookableServiceDto] })
  services!: BookableServiceDto[];
}
