import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EasyweekBookingSummaryDto {
  @ApiProperty({ description: 'EasyWeek booking UUID' })
  bookingUuid!: string;

  @ApiPropertyOptional({ description: 'EasyWeek location UUID' })
  locationUuid?: string | null;

  @ApiPropertyOptional()
  timezone?: string | null;

  @ApiPropertyOptional()
  isCanceled?: boolean;

  @ApiPropertyOptional()
  isCompleted?: boolean;

  @ApiPropertyOptional()
  statusName?: string | null;
}

export class ConfirmEasyweekBookingResponseDto {
  @ApiProperty()
  bookingId!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ description: 'Booking start datetime' })
  datetime!: Date;

  @ApiPropertyOptional({ description: 'Booking end datetime' })
  endDatetime?: Date | null;

  @ApiPropertyOptional({ type: () => EasyweekBookingSummaryDto })
  easyweek?: EasyweekBookingSummaryDto;
}
