import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { AppCategory } from '@prisma/client';
import { CreateAppCategoryDto } from '../dto/create-app-category.dto';
import { UpdateAppCategoryDto } from '../dto/update-app-category.dto';

@Injectable()
export class AppCategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(skip: number, take: number, onlyActive?: boolean): Promise<AppCategory[]> {
    return (this.prisma as any).appCategory.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      skip,
      take,
    });
  }

  async count(onlyActive?: boolean): Promise<number> {
    return (this.prisma as any).appCategory.count({ where: onlyActive ? { isActive: true } : undefined });
  }

  async findActive(): Promise<AppCategory[]> {
    return (this.prisma as any).appCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async create(dto: CreateAppCategoryDto): Promise<AppCategory> {
    return (this.prisma as any).appCategory.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        keywords: dto.keywords ?? [],
        sortOrder: dto.sortOrder ?? null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateAppCategoryDto): Promise<AppCategory | null> {
    const prismaAny = this.prisma as any;
    const existing = await prismaAny.appCategory.findUnique({ where: { id } });
    if (!existing) return null;
    return prismaAny.appCategory.update({
      where: { id },
      data: {
        slug: dto.slug ?? existing.slug,
        name: dto.name ?? existing.name,
        keywords: dto.keywords ?? existing.keywords,
        sortOrder: dto.sortOrder ?? existing.sortOrder,
        isActive: dto.isActive ?? existing.isActive,
      },
    });
  }

  async findBySlug(slug: string): Promise<AppCategory | null> {
    return (this.prisma as any).appCategory.findUnique({ where: { slug } });
  }

  async findById(id: string): Promise<AppCategory | null> {
    return (this.prisma as any).appCategory.findUnique({ where: { id } });
  }

  async delete(id: string): Promise<void> {
    await (this.prisma as any).appCategory.delete({ where: { id } });
  }
}
