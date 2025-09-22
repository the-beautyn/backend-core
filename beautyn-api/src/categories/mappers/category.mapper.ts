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
    crmExternalId: entity.crmExternalId ?? null,
    name: entity.name,
    color: entity.color ?? null,
    sortOrder: entity.sortOrder ?? null,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

