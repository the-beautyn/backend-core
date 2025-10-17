import { ApiProperty } from '@nestjs/swagger';
import { WorkerDto } from './worker.dto';

export class WorkersSyncResultDto {
  @ApiProperty({ type: WorkerDto, isArray: true })
  workers!: WorkerDto[];

  @ApiProperty()
  upserted!: number;

  @ApiProperty()
  deleted!: number;
}

export class WorkersSyncJobResponseDto {
  @ApiProperty()
  jobId!: string;
}
