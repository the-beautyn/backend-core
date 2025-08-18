import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class FinalizeEasyWeekResponseDto {
  @ApiProperty({ example: 'job_01J0ZB1XY8A9W3KZ9Q2N7SDF4T' })
  @Expose()
  job_id!: string;
}


