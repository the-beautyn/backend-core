import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

@Injectable()
export class TokenStorageService {
  constructor(private readonly prisma: PrismaService) {}

  async saveExternalSalonId(salonId: string, provider: string, externalId: string): Promise<void> {
    // Placeholder implementation: store external ID on salon record
    await this.prisma.salon.update({
      where: { id: salonId },
      data: { crmId: externalId },
    }).catch(() => undefined);
  }
}
