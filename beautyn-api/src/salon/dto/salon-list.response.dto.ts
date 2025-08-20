import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { SalonDto } from './salon.dto';

export class SalonListResponseDto {
  @ApiProperty({ type: [SalonDto] })
  @Expose()
  @Type(() => SalonDto)
  items!: SalonDto[];

  @ApiProperty({ example: 1 })
  @Expose()
  page!: number;

  @ApiProperty({ example: 20 })
  @Expose()
  limit!: number;

  @ApiProperty({ example: 100 })
  @Expose()
  total!: number;
}


