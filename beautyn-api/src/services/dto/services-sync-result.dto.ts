import { ApiProperty } from '@nestjs/swagger';
import { ServiceDto } from './service.dto';

export class ServicesSyncResultDto {
  @ApiProperty()
  upserted!: number;

  @ApiProperty()
  deleted!: number;

  @ApiProperty({ type: () => ServiceDto, isArray: true })
  services!: ServiceDto[];
}

export class ServicesSyncJobResponseDto {
  @ApiProperty()
  jobId!: string;
}
