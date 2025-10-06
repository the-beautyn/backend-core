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
    salonId: entity.salonId,
    crmCategoryId: entity.crmCategoryId,
    name: entity.name,
    color: entity.color ?? null,
    sortOrder: entity.sortOrder ?? null,
    serviceIds: Array.isArray((entity as any).serviceIds) ? (entity as any).serviceIds : [],
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
