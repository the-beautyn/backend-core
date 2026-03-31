import { Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/database/prisma.service';

@Injectable()
export class SavedSalonsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(userId: string, salonId: string) {
    return (this.prisma as any).savedSalon.upsert({
      where: { userId_salonId: { userId, salonId } },
      create: { userId, salonId },
      update: {},
    });
  }

  async unsave(userId: string, salonId: string) {
    await (this.prisma as any).savedSalon.deleteMany({
      where: { userId, salonId },
    });
  }

  async listByUser(userId: string, skip: number, take: number, nameFilter?: string) {
    const where: any = { userId };
    if (nameFilter) {
      where.salon = { name: { contains: nameFilter, mode: 'insensitive' } };
    }

    return (this.prisma as any).savedSalon.findMany({
      where,
      include: {
        salon: {
          select: {
            id: true,
            name: true,
            coverImageUrl: true,
            addressLine: true,
            city: true,
            ratingAvg: true,
            ratingCount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async countByUser(userId: string, nameFilter?: string): Promise<number> {
    const where: any = { userId };
    if (nameFilter) {
      where.salon = { name: { contains: nameFilter, mode: 'insensitive' } };
    }

    return (this.prisma as any).savedSalon.count({ where });
  }

  async isSavedBatch(userId: string, salonIds: string[]): Promise<string[]> {
    const results = await (this.prisma as any).savedSalon.findMany({
      where: { userId, salonId: { in: salonIds } },
      select: { salonId: true },
    });
    return results.map((r: any) => r.salonId);
  }

  async findByUserAndSalon(userId: string, salonId: string) {
    return (this.prisma as any).savedSalon.findUnique({
      where: { userId_salonId: { userId, salonId } },
    });
  }
}
