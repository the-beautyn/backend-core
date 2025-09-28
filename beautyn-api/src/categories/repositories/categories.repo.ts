import { Injectable } from '@nestjs/common';
import { Category, Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';

interface UpsertInput {
  crmExternalId: string | null;
  name: string;
  color: string | null;
  sortOrder: number | null;
}

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async paginate(salonId: string, skip: number, take: number): Promise<{ items: Category[]; total: number }> {
    const prismaAny = this.prisma as any;
    const [items, total] = await this.prisma.$transaction([
      prismaAny.category.findMany({
        where: { salonId },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take,
      }),
      prismaAny.category.count({ where: { salonId } }),
    ]);
    return { items, total };
  }

  async findById(categoryId: string): Promise<Category | null> {
    return (this.prisma as any).category.findUnique({ where: { id: categoryId } });
  }

  async findByIdWithinSalon(categoryId: string, salonId: string): Promise<Category | null> {
    return (this.prisma as any).category.findFirst({ where: { id: categoryId, salonId } });
  }

  async findByNameInsensitive(salonId: string, name: string, excludeId?: string): Promise<Category | null> {
    return (this.prisma as any).category.findFirst({
      where: {
        salonId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        name: { equals: name, mode: 'insensitive' } as Prisma.StringFilter,
      },
    });
  }

  async upsertFromCrm(salonId: string, payload: UpsertInput): Promise<Category> {
    const prismaAny = this.prisma as any;
    if (payload.crmExternalId) {
      const existing = await prismaAny.category.findFirst({
        where: { salonId, crmExternalId: payload.crmExternalId },
      });
      if (existing) {
        return prismaAny.category.update({
          where: { id: existing.id },
          data: {
            name: payload.name,
            color: payload.color,
            sortOrder: payload.sortOrder,
          },
        });
      }
    }

    return prismaAny.category.create({
      data: {
        salonId,
        crmExternalId: payload.crmExternalId,
        name: payload.name,
        color: payload.color,
        sortOrder: payload.sortOrder,
      },
    });
  }

  async update(categoryId: string, data: Partial<Omit<UpsertInput, 'crmExternalId'>>): Promise<Category> {
    return (this.prisma as any).category.update({
      where: { id: categoryId },
      data,
    });
  }

  async delete(categoryId: string): Promise<void> {
    await (this.prisma as any).category.delete({ where: { id: categoryId } });
  }

  async hasServices(categoryId: string): Promise<boolean> {
    const count: number = await (this.prisma as any).service.count({ where: { categoryId } });
    return count > 0;
  }
}

