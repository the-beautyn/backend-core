import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HomeFeedNextBookingDto {
  @ApiProperty()
  bookingId!: string;

  @ApiProperty()
  salonId!: string;

  @ApiProperty()
  salonName!: string;

  @ApiPropertyOptional()
  salonCoverImageUrl?: string | null;

  @ApiPropertyOptional()
  salonAddressLine?: string | null;

  @ApiProperty()
  datetime!: string;

  @ApiPropertyOptional()
  endDatetime?: string | null;

  @ApiPropertyOptional()
  totalPriceCents?: number | null;

  @ApiPropertyOptional()
  durationMinutes?: number | null;
}
