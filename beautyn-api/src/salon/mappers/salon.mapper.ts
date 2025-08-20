import { Salon, SalonImage } from '@prisma/client';
import { SalonDto } from '../dto/salon.dto';

export class SalonMapper {
  static toDto(entity: Salon): SalonDto {
    return {
      id: entity.id,
      crm_id: entity.crmId ?? undefined,
      name: entity.name,
      address_line: entity.addressLine ?? undefined,
      city: entity.city ?? undefined,
      country: entity.country ?? undefined,
      latitude: entity.latitude ? Number(entity.latitude) : undefined,
      longitude: entity.longitude ? Number(entity.longitude) : undefined,
      phone: entity.phone ?? undefined,
      email: entity.email ?? undefined,
      rating_avg: entity.ratingAvg ? Number(entity.ratingAvg) : undefined,
      rating_count: entity.ratingCount ?? undefined,
      open_hours_json: entity.openHoursJson ?? undefined,
      images_count: entity.imagesCount ?? undefined,
      cover_image_url: entity.coverImageUrl ?? undefined,
    };
  }

  static toImageDto(entity: SalonImage) {
    return {
      id: entity.id,
      image_url: entity.imageUrl,
      caption: entity.caption ?? undefined,
      sort_order: entity.sortOrder ?? undefined,
    };
  }
}
