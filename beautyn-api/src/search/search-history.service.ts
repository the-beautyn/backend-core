import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../shared/database/prisma.service';
import { SearchHistoryItemDto } from './dto/search-history-item.dto';

@Injectable()
export class SearchHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async addVisit(userId: string, salonId: string, lastQuery?: string | null): Promise<void> {
    await this.prisma.searchHistory.upsert({
      where: { userId_salonId: { userId, salonId } },
      update: { lastQuery: lastQuery ?? null, updatedAt: new Date() },
      create: { userId, salonId, lastQuery: lastQuery ?? null },
    });
  }

  async getHistory(userId: string, limit: number): Promise<SearchHistoryItemDto[]> {
    const rows = await this.prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: { salon: true },
    });
    return rows.map((row) => ({
      id: row.id,
      salonId: row.salonId,
      salonName: row.salon?.name ?? '',
      city: row.salon?.city ?? '',
      logoUrl: row.salon?.coverImageUrl ?? undefined,
      lastSearchedAt: row.updatedAt.toISOString(),
    }));
  }

  async clearHistory(userId: string): Promise<void> {
    await this.prisma.searchHistory.deleteMany({ where: { userId } });
  }

  async deleteHistoryItem(userId: string, historyId: string): Promise<void> {
    const res = await this.prisma.searchHistory.deleteMany({ where: { userId, id: historyId } });
    if (!res.count) {
      throw new NotFoundException('History item not found');
    }
  }
}
