import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CrmType } from '@crm/shared';
import { PrismaService } from '../shared/database/prisma.service';
import { CrmIntegrationService } from '../crm-integration/core/crm-integration.service';
import { BookingData } from '@crm/provider-core';

@Injectable()
export class BookingSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crm: CrmIntegrationService,
  ) {}

  async syncSalonBookingsNow(
    salonId: string,
    opts?: { withDeleted?: boolean; startDate?: string; endDate?: string },
  ): Promise<{ synced: number }> {
    const provider = await this.resolveProvider(salonId);
    const bookings = await this.crm.pullBookings(salonId, provider, {
      withDeleted: opts?.withDeleted,
      startDate: opts?.startDate,
      endDate: opts?.endDate,
    });
    for (const b of bookings) {
      await this.persistCrmBooking({ salonId, provider, booking: b });
    }
    return { synced: bookings.length };
  }

  async persistCrmBooking(params: { salonId: string; provider: CrmType; booking: BookingData }): Promise<void> {
    const { salonId, provider, booking } = params;
    const start = this.toDate(booking.startAtIso);
    if (!start) return;
    const end = typeof booking.durationMin === 'number' ? new Date(start.getTime() + booking.durationMin * 60 * 1000) : null;

    await this.prisma.$transaction(async (tx) => {
      const workerId = booking.workerExternalId
        ? await this.resolveWorkerId(tx, provider, booking.workerExternalId)
        : null;
      const mappedServiceIds = booking.serviceExternalIds?.length
        ? await this.resolveServiceIds(tx, provider, booking.serviceExternalIds)
        : [];

      await tx.booking.upsert({
        where: { crmType_crmRecordId: { crmType: provider, crmRecordId: booking.externalId } },
        create: {
          salonId,
          status: booking.isDeleted ? 'deleted' : 'created',
          datetime: start,
          endDatetime: end,
          comment: booking.note ?? null,
          crmType: provider,
          crmRecordId: booking.externalId,
          crmStaffId: booking.workerExternalId ?? null,
          crmServiceIds: booking.serviceExternalIds?.length ? booking.serviceExternalIds : Prisma.DbNull,
          serviceIds: mappedServiceIds.length ? mappedServiceIds : Prisma.DbNull,
          workerId,
        },
        update: {
          status: booking.isDeleted ? 'deleted' : 'created',
          datetime: start,
          endDatetime: end,
          comment: booking.note ?? null,
          crmStaffId: booking.workerExternalId ?? null,
          crmServiceIds: booking.serviceExternalIds?.length ? booking.serviceExternalIds : Prisma.DbNull,
          serviceIds: mappedServiceIds.length ? mappedServiceIds : Prisma.DbNull,
          workerId,
        },
      });
    });
  }

  private async resolveProvider(salonId: string): Promise<CrmType> {
    const salon = await this.prisma.salon.findUnique({
      where: { id: salonId },
      select: { provider: true },
    });
    if (!salon?.provider) {
      throw new Error('Salon provider is not set');
    }
    return salon.provider as CrmType;
  }

  private async resolveWorkerId(
    tx: Prisma.TransactionClient,
    provider: CrmType,
    externalId: string,
  ): Promise<string | null> {
    const mapping = await tx.workerMapping.findUnique({
      where: { provider_externalId: { provider, externalId } },
      select: { workerId: true },
    });
    return mapping?.workerId ?? null;
  }

  private async resolveServiceIds(
    tx: Prisma.TransactionClient,
    provider: CrmType,
    externalIds: string[],
  ): Promise<string[]> {
    const mappings = await tx.serviceMapping.findMany({
      where: { provider, externalId: { in: externalIds } },
      select: { serviceId: true },
    });
    return mappings.map((m) => m.serviceId).filter((id): id is string => !!id);
  }

  private toDate(value?: string | null): Date | null {
    if (!value) return null;
    const ts = Date.parse(value);
    return Number.isFinite(ts) ? new Date(ts) : null;
  }
}
