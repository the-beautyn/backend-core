import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ConfirmEasyweekBookingDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  salon_id!: string;

  @ApiProperty({ description: 'EasyWeek booking UUID' })
  @IsUUID()
  booking_uuid!: string;
}
