import { HomeFeedNextBookingDto } from '../dto/home-feed-next-booking.dto';
import { HomeFeedSalonCardDto } from '../dto/home-feed-salon-card.dto';
import { RawSearchRow } from '../../search/search-query-builder.service';

export function mapBookingToNextBooking(
  booking: any,
  salon: any,
): HomeFeedNextBookingDto {
  const dto = new HomeFeedNextBookingDto();
  dto.bookingId = booking.id;
  dto.salonId = booking.salonId;
  dto.salonName = salon?.name ?? '';
  dto.salonCoverImageUrl = salon?.coverImageUrl ?? null;
  dto.salonAddressLine = salon?.addressLine ?? null;
  dto.datetime = booking.datetime instanceof Date
    ? booking.datetime.toISOString()
    : booking.datetime;
  dto.endDatetime = booking.endDatetime
    ? (booking.endDatetime instanceof Date ? booking.endDatetime.toISOString() : booking.endDatetime)
    : null;
  dto.totalPriceCents = null;
  dto.durationMinutes = null;
  return dto;
}

export function mapSalonToCard(
  salon: any,
  opts?: { distanceKm?: number | null; isSaved?: boolean },
): HomeFeedSalonCardDto {
  const dto = new HomeFeedSalonCardDto();
  dto.id = salon.id;
  dto.name = salon.name ?? '';
  dto.coverImageUrl = salon.coverImageUrl ?? null;
  dto.addressLine = salon.addressLine ?? null;
  dto.city = salon.city ?? null;
  dto.ratingAvg = salon.ratingAvg != null ? Number(salon.ratingAvg) : null;
  dto.ratingCount = salon.ratingCount ?? null;
  dto.distanceKm = opts?.distanceKm ?? null;
  dto.isSaved = opts?.isSaved;
  return dto;
}

export function mapSearchRowToCard(row: RawSearchRow): HomeFeedSalonCardDto {
  const dto = new HomeFeedSalonCardDto();
  dto.id = row.id;
  dto.name = row.name ?? '';
  dto.coverImageUrl = row.cover_image_url ?? null;
  dto.addressLine = row.address_line ?? null;
  dto.city = row.city ?? null;
  dto.ratingAvg = row.rating_avg != null ? Number(row.rating_avg) : null;
  dto.ratingCount = row.rating_count ?? null;
  dto.distanceKm = row.distance_km != null ? Number(row.distance_km) : null;
  return dto;
}
