import { ApiProperty } from '@nestjs/swagger';
import { SortOptionEnum } from '../enums/sort-option.enum';

export class FilterOptionsResultDto {
  @ApiProperty({
    enum: SortOptionEnum,
    isArray: true,
    description: 'Allowed sortBy values for POST /search',
  })
  sort_options!: SortOptionEnum[];

  @ApiProperty({
    nullable: true,
    description:
      'Price-range track start: the cheapest service anywhere (main currency units, ' +
      'rounded down). The min knob resting here means priceMin is omitted. ' +
      'Null when no salon has price data.',
  })
  min_price!: number | null;

  @ApiProperty({
    nullable: true,
    description:
      'Price-range track end: the priciest service anywhere (main currency units, ' +
      'rounded up). The max knob resting here means priceMax is omitted. ' +
      'Null when no salon has price data.',
  })
  max_price!: number | null;
}
