import { Service } from '@prisma/client';
import { ServiceDto } from '../dto/service.dto';

export function toServiceDto(service: Service): ServiceDto {
  return {
    id: service.id,
    salon_id: service.salonId,
    crm_service_id: service.crmServiceId,
    category_id: service.categoryId ?? null,
    name: service.name,
    description: service.description ?? null,
    duration: service.duration,
    price: service.price,
    currency: service.currency,
    is_active: service.isActive,
    sort_order: service.sortOrder ?? null,
    worker_ids: service.workerIds ?? [],
  };
}
