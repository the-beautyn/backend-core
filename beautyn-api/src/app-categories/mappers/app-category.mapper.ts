import { AppCategory } from '@prisma/client';
import { AppCategoryResponseDto } from '../dto/app-category-response.dto';

export function toAppCategoryResponse(entity: AppCategory): AppCategoryResponseDto {
  return {
    id: entity.id,
    slug: entity.slug,
    name: entity.name,
    keywords: entity.keywords ?? [],
    image_url: entity.imageUrl ?? null,
    sort_order: entity.sortOrder ?? null,
    is_active: entity.isActive,
    created_at: entity.createdAt,
    updated_at: entity.updatedAt,
  };
}
