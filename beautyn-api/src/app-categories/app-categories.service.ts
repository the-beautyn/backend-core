import { Injectable } from '@nestjs/common';
import { AppCategoriesRepository } from './repositories/app-categories.repo';
import { CreateAppCategoryDto } from './dto/create-app-category.dto';
import { UpdateAppCategoryDto } from './dto/update-app-category.dto';
import { AppCategoryResponseDto } from './dto/app-category-response.dto';
import { toAppCategoryResponse } from './mappers/app-category.mapper';
import { ListAppCategoriesQueryDto, APP_CATEGORY_MAX_LIMIT } from './dto/list-app-categories.dto';
import { AppCategory } from '@prisma/client';

@Injectable()
export class AppCategoriesService {
  constructor(private readonly repo: AppCategoriesRepository) {}

  async list(query: ListAppCategoriesQueryDto): Promise<{ items: AppCategoryResponseDto[]; page: number; limit: number; total: number }> {
    const { page, limit, skip } = this.normalizePagination(query.page, query.limit);
    const [items, total] = await Promise.all([
      this.repo.list(skip, limit, query.onlyActive),
      this.repo.count(query.onlyActive),
    ]);
    return { items: items.map(toAppCategoryResponse), page, limit, total };
  }

  async create(dto: CreateAppCategoryDto): Promise<AppCategoryResponseDto> {
    const created = await this.repo.create(dto);
    return toAppCategoryResponse(created);
  }

  async update(id: string, dto: UpdateAppCategoryDto): Promise<AppCategoryResponseDto | null> {
    const updated = await this.repo.update(id, dto);
    return updated ? toAppCategoryResponse(updated) : null;
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.repo.findById(id);
    if (!existing) return false;
    await this.repo.delete(id);
    return true;
  }

  async findActiveForMatching(): Promise<AppCategory[]> {
    return this.repo.findActive();
  }

  matchByName(name: string, candidates: AppCategory[]): { appCategoryId: string; confidence: number } | null {
    const needle = (name ?? '').trim().toLowerCase();
    if (!needle) return null;

    let best: { appCategoryId: string; confidence: number } | null = null;
    for (const cat of candidates) {
      const catName = (cat.name ?? '').trim().toLowerCase();
      if (catName === needle) {
        best = { appCategoryId: cat.id, confidence: 1 };
        break;
      }
      const keywords = (cat.keywords ?? []).map((k) => (k ?? '').trim().toLowerCase()).filter(Boolean);
      if (keywords.includes(needle)) {
        const conf = 0.9;
        if (!best || conf > best.confidence) {
          best = { appCategoryId: cat.id, confidence: conf };
        }
      }
    }
    return best;
  }

  private normalizePagination(page?: number, limit?: number): { page: number; limit: number; skip: number } {
    const resolvedPage = page && page > 0 ? page : 1;
    let resolvedLimit = limit && limit > 0 ? limit : 20;
    resolvedLimit = Math.min(resolvedLimit, APP_CATEGORY_MAX_LIMIT);
    return {
      page: resolvedPage,
      limit: resolvedLimit,
      skip: (resolvedPage - 1) * resolvedLimit,
    };
  }
}
