import { AppCategory } from '@prisma/client';
import { AppCategoryResponseDto } from '../dto/app-category-response.dto';

export function toAppCategoryResponse(entity: AppCategory): AppCategoryResponseDto {
  return {
    id: entity.id,
    slug: entity.slug,
    name: entity.name,
    keywords: entity.keywords ?? [],
    imageUrl: entity.imageUrl ?? null,
    sortOrder: entity.sortOrder ?? null,
    isActive: entity.isActive,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
