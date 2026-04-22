import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EasyweekBookingSummaryDto {
  @ApiProperty({ description: 'EasyWeek booking UUID' })
  booking_uuid!: string;

  @ApiPropertyOptional({ description: 'EasyWeek location UUID' })
  location_uuid?: string | null;

  @ApiPropertyOptional()
  timezone?: string | null;

  @ApiPropertyOptional()
  is_canceled?: boolean;

  @ApiPropertyOptional()
  is_completed?: boolean;

  @ApiPropertyOptional()
  status_name?: string | null;
}

export class ConfirmEasyweekBookingResponseDto {
  @ApiProperty()
  booking_id!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ description: 'Booking start datetime' })
  datetime!: Date;

  @ApiPropertyOptional({ description: 'Booking end datetime' })
  end_datetime?: Date | null;

  @ApiPropertyOptional({ type: () => EasyweekBookingSummaryDto })
  easyweek?: EasyweekBookingSummaryDto;
}
