import { ApiProperty } from '@nestjs/swagger';

export class TimeSlotDto {
  @ApiProperty()
  time!: string;

  @ApiProperty()
  datetime!: string;

  @ApiProperty()
  seanceLengthSec!: number;

  @ApiProperty()
  sumLengthSec!: number;
}

export class TimeSlotsResponseDto {
  @ApiProperty({ type: [TimeSlotDto] })
  slots!: TimeSlotDto[];
}
