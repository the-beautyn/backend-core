import { Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/database/prisma.service';
import { HomeFeedSection, Prisma } from '@prisma/client';

@Injectable()
export class HomeFeedSectionConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listActive(): Promise<HomeFeedSection[]> {
    return this.prisma.homeFeedSection.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async listAll(): Promise<HomeFeedSection[]> {
    return this.prisma.homeFeedSection.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findById(id: string): Promise<HomeFeedSection | null> {
    return this.prisma.homeFeedSection.findUnique({ where: { id } });
  }

  async create(data: Prisma.HomeFeedSectionCreateInput): Promise<HomeFeedSection> {
    return this.prisma.homeFeedSection.create({ data });
  }

  async update(id: string, data: Prisma.HomeFeedSectionUpdateInput): Promise<HomeFeedSection> {
    return this.prisma.homeFeedSection.update({ where: { id }, data });
  }

  async delete(id: string): Promise<HomeFeedSection> {
    return this.prisma.homeFeedSection.delete({ where: { id } });
  }
}
