import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { HomeFeedSectionConfigRepository } from './home-feed-section-config.repository';
import { CreateHomeFeedSectionDto } from './dto/create-home-feed-section.dto';
import { UpdateHomeFeedSectionDto } from './dto/update-home-feed-section.dto';
import { HomeFeedSection } from '@prisma/client';
import { PrismaService } from '../shared/database/prisma.service';
import { HomeFeedSectionFiltersDto } from './dto/home-feed-section-filters.dto';

@Injectable()
export class HomeFeedSectionConfigService {
  constructor(
    private readonly repo: HomeFeedSectionConfigRepository,
    private readonly prisma: PrismaService,
  ) {}

  async list(): Promise<HomeFeedSection[]> {
    return this.repo.listAll();
  }

  async create(dto: CreateHomeFeedSectionDto): Promise<HomeFeedSection> {
    await this.validateFilters(dto.filters);
    return this.repo.create({
      type: dto.type,
      title: dto.title,
      emoji: dto.emoji,
      sortOrder: dto.sortOrder,
      limit: dto.limit ?? 10,
      isActive: dto.isActive ?? true,
      filters: dto.filters ? (dto.filters as any) : undefined,
    });
  }

  async update(id: string, dto: UpdateHomeFeedSectionDto): Promise<HomeFeedSection> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException('Home feed section not found');
    }

    const mergedFilters = dto.filters !== undefined
      ? dto.filters
      : (existing.filters as HomeFeedSectionFiltersDto | null);
    await this.validateFilters(mergedFilters ?? undefined);

    const data: any = {};
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.emoji !== undefined) data.emoji = dto.emoji;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.limit !== undefined) data.limit = dto.limit;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.filters !== undefined) data.filters = dto.filters as any;

    return this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException('Home feed section not found');
    }
    await this.repo.delete(id);
  }

  private async validateFilters(filters?: HomeFeedSectionFiltersDto): Promise<void> {
    if (!filters?.appCategoryId) return;
    const cat = await this.prisma.appCategory.findUnique({
      where: { id: filters.appCategoryId },
    });
    if (!cat) {
      throw new BadRequestException('AppCategory not found');
    }
  }
}
