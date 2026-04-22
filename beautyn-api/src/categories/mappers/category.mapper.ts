import { Category } from '@prisma/client';
import { CategoryResponseDto } from '../dto/category-response.dto';

export function normalizeHexColor(color?: string | null): string | null {
  if (!color) return null;
  const trimmed = color.trim();
  if (!trimmed) return null;
  const prefixed = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return prefixed.toUpperCase();
}

export function toCategoryResponse(entity: Category): CategoryResponseDto {
  return {
    id: entity.id,
    salon_id: entity.salonId,
    crm_category_id: entity.crmCategoryId,
    name: entity.name,
    color: entity.color ?? null,
    sort_order: entity.sortOrder ?? null,
    service_ids: Array.isArray((entity as any).serviceIds) ? (entity as any).serviceIds : [],
    created_at: entity.createdAt,
    updated_at: entity.updatedAt,
  };
}
