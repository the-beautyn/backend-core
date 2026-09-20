import { ApiProperty } from '@nestjs/swagger';
import { SalonClientDto } from './salon-client.dto';

export class SalonClientsListResponseDto {
  @ApiProperty({ type: SalonClientDto, isArray: true })
  items!: SalonClientDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 137 })
  total!: number;
}
