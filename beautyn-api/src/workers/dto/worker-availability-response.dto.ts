import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class WorkerAvailabilitySlotDto {
  @ApiProperty({ example: '09:00' })
  @Expose()
  from!: string;

  @ApiProperty({ example: '09:30' })
  @Expose()
  to!: string;
}

export class WorkerAvailabilityResponseDto {
  @ApiProperty({ type: [WorkerAvailabilitySlotDto] })
  @Type(() => WorkerAvailabilitySlotDto)
  @Expose()
  slots!: WorkerAvailabilitySlotDto[];
}


