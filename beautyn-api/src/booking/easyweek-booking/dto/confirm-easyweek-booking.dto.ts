import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ConfirmEasyweekBookingDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  salonId!: string;

  @ApiProperty({ description: 'EasyWeek booking UUID' })
  @IsUUID()
  bookingUuid!: string;
}
