import { ApiProperty } from '@nestjs/swagger';
import { TimeSlotDto } from './time-slots.response.dto';

export class BookableWorkerDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false, nullable: true })
  specialization?: string | null;

  @ApiProperty({ required: false, nullable: true })
  avatar?: string | null;

  @ApiProperty({ required: false, nullable: true })
  rating?: number | null;

  @ApiProperty()
  bookable!: boolean;

  @ApiProperty({ type: () => [TimeSlotDto], required: false, nullable: true })
  slots?: TimeSlotDto[] | null;
}

export class BookableWorkersResponseDto {
  @ApiProperty({ type: [BookableWorkerDto] })
  workers!: BookableWorkerDto[];
}
