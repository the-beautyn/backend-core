import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ServiceDto } from './service.dto';

export class ServicesListResponseDto {
  @ApiProperty({ type: [ServiceDto] })
  @Expose()
  @Type(() => ServiceDto)
  items!: ServiceDto[];

  @ApiProperty({ example: 1 })
  @Expose()
  page!: number;

  @ApiProperty({ example: 50 })
  @Expose()
  limit!: number;

  @ApiProperty({ example: 123 })
  @Expose()
  total!: number;
}


