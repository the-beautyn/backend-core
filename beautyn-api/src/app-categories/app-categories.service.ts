import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AppCategoriesRepository } from './repositories/app-categories.repo';
import { CreateAppCategoryDto } from './dto/create-app-category.dto';
import { UpdateAppCategoryDto } from './dto/update-app-category.dto';
import { AppCategoryResponseDto } from './dto/app-category-response.dto';
import { toAppCategoryResponse } from './mappers/app-category.mapper';
import { ListAppCategoriesQueryDto, APP_CATEGORY_MAX_LIMIT } from './dto/list-app-categories.dto';
import { StorageService } from '../shared/storage/storage.service';
import { AppCategory } from '@prisma/client';

const BUCKET = 'categories';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

@Injectable()
export class AppCategoriesService {
  constructor(
    private readonly repo: AppCategoriesRepository,
    private readonly storage: StorageService,
  ) {}

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

  async uploadImage(id: string, file: Express.Multer.File): Promise<AppCategoryResponseDto> {
    const category = await this.repo.findById(id);
    if (!category) throw new NotFoundException('App category not found');

    const oldImageUrl = category.imageUrl;

    const ext = MIME_TO_EXT[file.mimetype] ?? '.jpg';
    const path = `${randomUUID()}${ext}`;
    const publicUrl = await this.storage.upload(BUCKET, path, file.buffer, file.mimetype);

    const updated = await this.repo.updateImageUrl(id, publicUrl);
    if (!updated) throw new NotFoundException('App category not found');

    // Best-effort cleanup of old image after successful upload + DB update
    if (oldImageUrl) {
      const oldPath = this.storage.extractPath(BUCKET, oldImageUrl);
      if (oldPath) await this.storage.delete(BUCKET, oldPath);
    }

    return toAppCategoryResponse(updated);
  }

  async deleteImage(id: string): Promise<AppCategoryResponseDto> {
    const category = await this.repo.findById(id);
    if (!category) throw new NotFoundException('App category not found');

    const oldImageUrl = category.imageUrl;

    const updated = await this.repo.updateImageUrl(id, null);
    if (!updated) throw new NotFoundException('App category not found');

    // Best-effort cleanup after DB update
    if (oldImageUrl) {
      const oldPath = this.storage.extractPath(BUCKET, oldImageUrl);
      if (oldPath) await this.storage.delete(BUCKET, oldPath);
    }

    return toAppCategoryResponse(updated);
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
