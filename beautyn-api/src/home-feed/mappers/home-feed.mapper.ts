import { HomeFeedNextBookingDto } from '../dto/home-feed-next-booking.dto';
import { HomeFeedSalonCardDto } from '../dto/home-feed-salon-card.dto';
import { BookingDto } from '../../booking/dto/booking.response.dto';
import { RawSearchRow } from '../../search/search-query-builder.service';

// Built from the fully-resolved `BookingDto` (same source as the bookings list)
// so the Home "next appointment" card shows the same price / duration / services.
export function mapBookingToNextBooking(booking: BookingDto): HomeFeedNextBookingDto {
  const dto = new HomeFeedNextBookingDto();
  dto.booking_id = booking.id;
  dto.salon_id = booking.salon_id;
  dto.salon_name = booking.salon?.name ?? '';
  dto.salon_cover_image_url = booking.salon?.cover_image_url ?? null;
  dto.salon_address_line = booking.salon?.address_line ?? null;
  dto.salon_timezone = booking.salon?.timezone ?? null;
  dto.datetime = booking.datetime;
  dto.end_datetime = booking.end_datetime ?? null;
  // `total_price` is the raw provider amount (minor units); the iOS client divides
  // by 100, identical to the bookings list, so both screens show the same price.
  dto.total_price_cents = booking.total_price ?? null;
  dto.duration_minutes = booking.duration_minutes ?? null;
  dto.service_names = booking.service_names ?? [];
  return dto;
}

export function mapSalonToCard(
  salon: any,
  opts?: { distanceKm?: number | null; isSaved?: boolean },
): HomeFeedSalonCardDto {
  const dto = new HomeFeedSalonCardDto();
  dto.id = salon.id;
  dto.name = salon.name ?? '';
  dto.cover_image_url = salon.coverImageUrl ?? null;
  dto.address_line = salon.addressLine ?? null;
  dto.city = salon.city ?? null;
  dto.rating_avg = salon.ratingAvg != null ? Number(salon.ratingAvg) : null;
  dto.rating_count = salon.ratingCount ?? null;
  dto.distance_km = opts?.distanceKm ?? null;
  dto.is_saved = opts?.isSaved;
  return dto;
}

export function mapSearchRowToCard(row: RawSearchRow): HomeFeedSalonCardDto {
  const dto = new HomeFeedSalonCardDto();
  dto.id = row.id;
  dto.name = row.name ?? '';
  dto.cover_image_url = row.cover_image_url ?? null;
  dto.address_line = row.address_line ?? null;
  dto.city = row.city ?? null;
  dto.rating_avg = row.rating_avg != null ? Number(row.rating_avg) : null;
  dto.rating_count = row.rating_count ?? null;
  dto.distance_km = row.distance_km != null ? Number(row.distance_km) : null;
  return dto;
}
