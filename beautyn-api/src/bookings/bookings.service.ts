import { Injectable, NotFoundException } from '@nestjs/common';
import { CrmAdapterService } from '@crm/adapter';
import { CrmType } from '@crm/shared';
import type { BookingData } from '@crm/provider-core';
import { PrismaService } from '../shared/database/prisma.service';

@Injectable()
export class BookingsService {
  constructor(private readonly crm: CrmAdapterService, private readonly prisma: PrismaService) {}

  async pullBookings(
    salonId: string,
    provider: CrmType,
    opts?: { clientExternalId?: string; withDeleted?: boolean; startDate?: string; endDate?: string },
  ): Promise<BookingData[]> {
    return this.crm.pullBookings(salonId, provider, opts);
  }

  async pullMyBookings(
    userId: string,
    opts?: { clientExternalId?: string; withDeleted?: boolean; startDate?: string; endDate?: string; page?: number; count?: number },
  ): Promise<BookingData[]> {
    const salon = await this.prisma.salon.findFirst({
      where: { ownerUserId: userId, deletedAt: null },
      select: { id: true, provider: true },
    });
    if (!salon?.id || !salon?.provider) throw new NotFoundException('Salon or provider not found for user');
    // Provider handles pagination
    return this.crm.pullBookings(salon.id, salon.provider as unknown as CrmType, opts);
  }
}


