import { Injectable } from '@nestjs/common';
import { ClientSettings } from '@prisma/client';
import { PrismaService } from '../shared/database/prisma.service';

@Injectable()
export class ClientSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string) {
    return this.prisma.clientSettings.findUnique({ where: { userId } });
  }

  upsertByUserId(userId: string, data: Partial<ClientSettings>) {
    return this.prisma.clientSettings.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }
}
