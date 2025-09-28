import { Service } from '@prisma/client';
import { ServiceDto } from '../dto/service.dto';

export function toServiceDto(service: Service): ServiceDto {
  return {
    id: service.id,
    salon_id: service.salonId,
    crm_external_id: service.crmExternalId ?? null,
    category_id: service.categoryId ?? null,
    name: service.name,
    description: service.description ?? null,
    duration_minutes: service.durationMinutes,
    price_cents: service.priceCents,
    currency: service.currency,
    is_active: service.isActive,
  };
}
