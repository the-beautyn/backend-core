import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../shared/database/prisma.service';
import { SavedSalonsRepository } from './saved-salons.repository';
import { SavedSalonListQueryDto } from './dto/saved-salon-list-query.dto';
import { SavedSalonItemDto, SavedSalonListResponseDto } from './dto/saved-salon-response.dto';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@Injectable()
export class SavedSalonsService {
  constructor(
    private readonly repo: SavedSalonsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async save(userId: string, salonId: string): Promise<void> {
    const salon = await this.prisma.salon.findFirst({ where: { id: salonId, deletedAt: null } });
    if (!salon) {
      throw new NotFoundException('Salon not found');
    }
    await this.repo.save(userId, salonId);
  }

  async unsave(userId: string, salonId: string): Promise<void> {
    await this.repo.unsave(userId, salonId);
  }

  async listByUser(userId: string, query: SavedSalonListQueryDto): Promise<SavedSalonListResponseDto> {
    const page = query.page && query.page > 0 ? query.page : 1;
    let limit = query.limit && query.limit > 0 ? query.limit : DEFAULT_LIMIT;
    limit = Math.min(limit, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.repo.listByUser(userId, skip, limit, query.q),
      this.repo.countByUser(userId, query.q),
    ]);

    return {
      items: items.map((item: any) => this.toDto(item)),
      page,
      limit,
      total,
    };
  }

  async isSavedBatch(userId: string, salonIds: string[]): Promise<Set<string>> {
    const savedIds = await this.repo.isSavedBatch(userId, salonIds);
    return new Set(savedIds);
  }

  private toDto(item: any): SavedSalonItemDto {
    return {
      id: item.id,
      salon_id: item.salonId,
      salon_name: item.salon?.name ?? '',
      cover_image_url: item.salon?.coverImageUrl ?? null,
      address_line: item.salon?.addressLine ?? null,
      city: item.salon?.city ?? null,
      rating_avg: item.salon?.ratingAvg != null ? Number(item.salon.ratingAvg) : null,
      rating_count: item.salon?.ratingCount ?? null,
      saved_at: item.createdAt.toISOString(),
    };
  }
}
