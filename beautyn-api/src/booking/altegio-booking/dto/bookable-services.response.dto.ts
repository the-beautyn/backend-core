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
  categoryId!: string | null;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  price!: number;

  @ApiProperty({ required: false, nullable: true })
  durationSec!: number | null;

  @ApiProperty()
  isAvailable!: boolean;
}

export class BookableServicesResponseDto {
  @ApiProperty({ type: [BookableServiceCategoryDto] })
  categories!: BookableServiceCategoryDto[];

  @ApiProperty({ type: [BookableServiceDto] })
  services!: BookableServiceDto[];
}
