import { Injectable } from '@nestjs/common';
import { OwnerSettings } from '@prisma/client';
import { PrismaService } from '../shared/database/prisma.service';

@Injectable()
export class OwnerSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string) {
    return this.prisma.ownerSettings.findUnique({ where: { userId } });
  }

  upsertByUserId(userId: string, data: Partial<OwnerSettings>) {
    return this.prisma.ownerSettings.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }
}
