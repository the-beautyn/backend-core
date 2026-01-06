import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class ConfirmEasyweekBookingDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  salonId!: string;

  @ApiProperty({ description: 'EasyWeek booking UUID' })
  @IsUUID()
  bookingUuid!: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Override user id (defaults to authenticated user)' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
