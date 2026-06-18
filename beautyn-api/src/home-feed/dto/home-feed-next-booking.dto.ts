import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HomeFeedNextBookingServiceDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Per-service price in minor units (cents); the client divides by 100. Null when unknown.',
  })
  price_cents?: number | null;
}

export class HomeFeedNextBookingDto {
  @ApiProperty()
  booking_id!: string;

  @ApiProperty()
  salon_id!: string;

  @ApiProperty()
  salon_name!: string;

  @ApiPropertyOptional()
  salon_cover_image_url?: string | null;

  @ApiPropertyOptional()
  salon_address_line?: string | null;

  @ApiPropertyOptional({
    description: 'IANA timezone identifier of the salon (e.g. "Europe/Kyiv"). Null when unknown.',
  })
  salon_timezone?: string | null;

  @ApiProperty()
  datetime!: string;

  @ApiPropertyOptional()
  end_datetime?: string | null;

  @ApiPropertyOptional()
  total_price_cents?: number | null;

  @ApiPropertyOptional()
  duration_minutes?: number | null;

  @ApiPropertyOptional({ type: [String] })
  service_names?: string[];

  @ApiPropertyOptional({
    type: [HomeFeedNextBookingServiceDto],
    description: 'Per-service breakdown (name + price) so Booking Details matches the bookings list.',
  })
  services?: HomeFeedNextBookingServiceDto[];

  @ApiPropertyOptional({
    description: 'Short link to view/manage the booking. Drives the "Make Changes" action on the client.',
  })
  short_link?: string | null;
}
