import { HomeFeedNextBookingDto } from '../dto/home-feed-next-booking.dto';
import { HomeFeedSalonCardDto } from '../dto/home-feed-salon-card.dto';
import { RawSearchRow } from '../../search/search-query-builder.service';

export function mapBookingToNextBooking(
  booking: any,
  salon: any,
): HomeFeedNextBookingDto {
  const dto = new HomeFeedNextBookingDto();
  dto.booking_id = booking.id;
  dto.salon_id = booking.salonId;
  dto.salon_name = salon?.name ?? '';
  dto.salon_cover_image_url = salon?.coverImageUrl ?? null;
  dto.salon_address_line = salon?.addressLine ?? null;
  dto.datetime = booking.datetime instanceof Date
    ? booking.datetime.toISOString()
    : booking.datetime;
  dto.end_datetime = booking.endDatetime
    ? (booking.endDatetime instanceof Date ? booking.endDatetime.toISOString() : booking.endDatetime)
    : null;
  dto.total_price_cents = null;
  dto.duration_minutes = null;
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
