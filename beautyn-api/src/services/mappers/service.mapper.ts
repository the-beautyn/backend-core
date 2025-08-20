import { Category, Service } from '@prisma/client';
import { CategoryDto } from '../dto/category.dto';
import { ServiceDto } from '../dto/service.dto';

export function toCategoryDto(category: Category): CategoryDto {
  return {
    id: category.id,
    salon_id: category.salonId,
    crm_external_id: category.crmExternalId ?? null,
    name: category.name,
    color: category.color ?? null,
    sort_order: category.sortOrder ?? null,
    created_at: category.createdAt,
    updated_at: category.updatedAt,
  };
}

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
