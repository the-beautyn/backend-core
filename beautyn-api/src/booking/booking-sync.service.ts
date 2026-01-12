import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CrmType } from '@crm/shared';
import { PrismaService } from '../shared/database/prisma.service';
import { CrmIntegrationService } from '../crm-integration/core/crm-integration.service';
import { BookingData, Page } from '@crm/provider-core';
import { createChildLogger } from '@shared/logger';
import type { BookingDto } from './dto/booking.response.dto';

@Injectable()
export class BookingSyncService {
  private readonly log = createChildLogger('booking-sync.service');
  constructor(
    private readonly prisma: PrismaService,
    private readonly crm: CrmIntegrationService,
  ) {}

  async rebaseFromCrm(salonId: string): Promise<BookingDto[]> {
    const provider = await this.crm.resolveSalonProvider(salonId);

    const bookingIds = await this.prisma.booking
      .findMany({
        where: {
          salonId,
          crmType: provider,
          crmRecordId: { not: null },
        },
        select: { crmRecordId: true },
      })
      .then((rows) =>
        rows
          .map((row) => row.crmRecordId as string)
          .filter((id): id is string => Boolean(id)),
      );

    const result = await this.crm.rebaseBookingsNow(salonId, bookingIds, provider);
    return result;
  }
}
