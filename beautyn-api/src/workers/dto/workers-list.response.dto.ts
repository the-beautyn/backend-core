import { ApiProperty } from '@nestjs/swagger';
import { WorkerDto } from './worker.dto';

export class WorkersListResponseDto {
  @ApiProperty({ type: WorkerDto, isArray: true })
  items!: WorkerDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}
