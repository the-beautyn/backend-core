import { ApiProperty } from '@nestjs/swagger';

export class BookableDatesResponseDto {
  @ApiProperty({ type: [String] })
  bookingDates!: string[];
}
