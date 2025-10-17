import { ApiProperty } from '@nestjs/swagger';
import { PublicWorkerDto } from './worker-public.dto';

export class PublicWorkersListResponseDto {
  @ApiProperty({ type: PublicWorkerDto, isArray: true })
  items!: PublicWorkerDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}
