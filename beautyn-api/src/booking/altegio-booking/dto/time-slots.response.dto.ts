import { ApiProperty } from '@nestjs/swagger';

export class TimeSlotDto {
  @ApiProperty()
  time!: string;

  @ApiProperty()
  datetime!: string;

  @ApiProperty()
  seance_length_sec!: number;

  @ApiProperty()
  sum_length_sec!: number;
}

export class TimeSlotsResponseDto {
  @ApiProperty({ type: [TimeSlotDto] })
  slots!: TimeSlotDto[];
}
