import { BadGatewayException, BadRequestException, HttpException, HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CrmError, CrmType, ErrorKind } from '@crm/shared';
import { AccountRegistryService } from '@crm/account-registry';
import { TokenStorageService } from '@crm/token-storage';
import { CrmAdapterService } from '@crm/adapter';
import { createChildLogger } from '@shared/logger';
import type { BookingDto } from '../../booking/dto/booking.response.dto';

import {
  CategoryData,
  CategoryCreateInput,
  CategoryUpdateInput,
  ServiceData,
  ServiceCreateInput,
  ServiceUpdateInput,
  WorkerData,
  WorkerCreateInput,
  WorkerUpdateInput,
  Page,
  SalonData,
  BookingData,
} from '@crm/provider-core';
import { SyncSchedulerService, Lane } from '@crm/sync-scheduler';
import { EasyweekBookingDtoNormalized } from './dto/easyweek-booking.dto';

@Injectable()
export class CrmIntegrationService {
  private readonly log = createChildLogger('crm-integration.service');
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountRegistryService,
    private readonly tokens: TokenStorageService,
    private readonly adapter: CrmAdapterService,
    private readonly scheduler: SyncSchedulerService,
  ) {}

  private logger = new Logger(CrmIntegrationService.name);

  //* Public API *//

  //** CRM Connector **//

  // Creates a draft Salon linked to Altegio by external id and provider.
  // Further metadata and tokens should be stored in AccountRegistry/TokenStorage.
  async linkAltegio({
    userId,
    externalSalonIds,
  }: {
    userId: string;
    externalSalonIds: string[];
  }): Promise<{ salonIds: string[] }> {
    const salonIds: string[] = [];
    for (const externalSalonId of externalSalonIds) {
      const ext = String(externalSalonId);
      const existing = await this.prisma.salon.findFirst({
        where: { provider: CrmType.ALTEGIO, externalSalonId: ext },
        select: { id: true, ownerUserId: true },
      });
      if (existing) {
        if (existing.ownerUserId && existing.ownerUserId !== userId) {
          throw new BadRequestException('Altegio salon already linked to another user');
        }
        if (!existing.ownerUserId) {
          await this.prisma.salon.update({
            where: { id: existing.id },
            data: { ownerUserId: userId },
          });
        }
        salonIds.push(existing.id);
        continue;
      }

      const salon = await this.prisma.salon.create({
        data: { ownerUserId: userId, externalSalonId: ext, provider: CrmType.ALTEGIO },
        select: { id: true },
      });

      // Persist non-secret account identifiers in Account Registry
      await this.accounts.setAltegio(salon.id, { externalSalonId: Number(ext) });

      // If global env tokens are configured, persist them as per-salon tokens
      const envBearer = process.env.ALTEGIO_BEARER?.trim();
      const envUser = process.env.ALTEGIO_USER?.trim();
      if (envBearer && envUser) {
        await this.tokens.store(salon.id, CrmType.ALTEGIO, { accessToken: envBearer, userToken: envUser });
      }
      salonIds.push(salon.id);
    }
    return { salonIds };
  }

  // Creates a draft Salon linked to EasyWeek by external id and provider.
  // workspaceSlug/auth are handled by AccountRegistry/TokenStorage; here we just persist the link anchor.
  async linkEasyWeek({
    userId,
    authToken,
    workspaceSlug,
    externalSalonIds,
    widgetUrl,
  }: {
    userId: string;
    authToken: string;
    workspaceSlug: string;
    externalSalonIds: string[];
    widgetUrl?: string;
  }): Promise<{ salonIds: string[] }> {
    // Use the owner-provided widget URL, or derive it from the workspace slug.
    const bookingUrl = widgetUrl?.trim() || `https://booking.easyweek.com.ua/${workspaceSlug}`;
    const salonIds: string[] = [];
    for (const externalSalonId of externalSalonIds) {
      const ext = String(externalSalonId);
      const existing = await this.prisma.salon.findFirst({
        where: { provider: CrmType.EASYWEEK, externalSalonId: ext },
        select: { id: true, ownerUserId: true, bookingUrl: true },
      });
      if (existing) {
        if (existing.ownerUserId && existing.ownerUserId !== userId) {
          throw new BadRequestException('EasyWeek salon already linked to another user');
        }
        if (!existing.ownerUserId || !existing.bookingUrl) {
          await this.prisma.salon.update({
            where: { id: existing.id },
            data: {
              ...(existing.ownerUserId ? {} : { ownerUserId: userId }),
              ...(existing.bookingUrl ? {} : { bookingUrl }),
            },
          });
        }
        salonIds.push(existing.id);
        continue;
      }

      const salon = await this.prisma.salon.create({
        data: { ownerUserId: userId, externalSalonId: ext, provider: CrmType.EASYWEEK, bookingUrl },
        select: { id: true },
      });
      // Persist non-secret identifiers
      await this.accounts.setEasyWeek(salon.id, { workspaceSlug, locationId: ext });
      // Store secret/API key in Token Storage
      await this.tokens.store(salon.id, CrmType.EASYWEEK, { apiKey: authToken });
      salonIds.push(salon.id);
    }
    return { salonIds };
  }

  //** CRM Sync Scheduler **//

  async enqueueInitialSync(salonId: string, provider: CrmType): Promise<{ jobId: string }> {
    const jobId = await this.scheduler.scheduleSync({ salonId, provider }, { type: 'initial' });
    return { jobId };
  }

  //*** Salon ***//

  async pullSalon(salonId: string, provider: CrmType): Promise<SalonData> {
    return this.adapter.pullSalon(salonId, provider);
  }

  async pullSalonRaw(salonId: string): Promise<SalonData> {
    const salon = await this.prisma.salon.findUnique({
      where: { id: salonId },
      select: { provider: true },
    });
    if (!salon?.provider) {
      throw new BadRequestException('Salon is not linked to a CRM provider');
    }
    const provider = salon.provider as CrmType;
    return this.adapter.pullSalon(salonId, provider);
  }

  async enqueueSalonSync(salonId: string, provider?: CrmType): Promise<{ jobId: string }> {
    const resolvedProvider = provider ?? (await this.resolveSalonProvider(salonId));
    const jobId = await this.scheduler.scheduleSync({ salonId, provider: resolvedProvider }, { type: 'salon' });
    return { jobId };
  }

  // --- Booking flow passthrough ---
  async bookServices(salonId: string, provider: CrmType, args?: { serviceIds?: number[]; staffId?: number; datetime?: string }) {
    return this.adapter.bookServices(salonId, provider, args);
  }

  async bookStaff(salonId: string, provider: CrmType, args?: { serviceIds?: number[]; datetime?: string }) {
    return this.adapter.bookStaff(salonId, provider, args);
  }

  async bookDates(
    salonId: string,
    provider: CrmType,
    args?: { serviceIds?: number[]; staffId?: number; dateFrom?: string; dateTo?: string },
  ) {
    return this.adapter.bookDates(salonId, provider, args);
  }

  async bookTimes(
    salonId: string,
    provider: CrmType,
    args: { staffId: number; date: string; serviceIds?: number[] },
  ) {
    return this.adapter.bookTimes(salonId, provider, args);
  }

  async createRecord(salonId: string, provider: CrmType, payload: any) {
    return this.adapter.createRecord(salonId, provider, payload);
  }

  async fetchEasyweekBookingDetails(params: { bookingUuid: string; salonId: string }): Promise<EasyweekBookingDtoNormalized> {
    const { bookingUuid, salonId } = params;
    if (!bookingUuid || !salonId) {
      throw new BadRequestException('bookingUuid and salonId are required');
    }
    const salon = await this.prisma.salon.findUnique({ where: { id: salonId }, select: { provider: true } });
    if (!salon || salon.provider !== CrmType.EASYWEEK) {
      throw new BadRequestException('Salon is not linked to EasyWeek');
    }

    try {
      const res = await this.adapter.fetchEasyWeekBookingDetails(salonId, bookingUuid);
      return {
        bookingUuid: res.uuid,
        locationUuid: res.locationUuid ?? null,
        startTime: res.startTime ?? null,
        endTime: res.endTime ?? null,
        timezone: res.timezone ?? null,
        isCanceled: res.isCanceled ?? undefined,
        isCompleted: res.isCompleted ?? undefined,
        statusName: res.statusName ?? null,
        orderedServices: res.orderedServices,
        order: res.order,
        comment: res.publicNotes ?? null,
        duration: res.duration,
        policy: res.policy,
        links: res.links,
        raw: res.raw,
      };
    } catch (e) {
      this.mapCrmErrorToHttpException(e);
      throw e;
    }
  }

  async getEasyweekWorkspaceSlug(salonId: string): Promise<string> {
    const acc = await this.accounts.get(salonId, CrmType.EASYWEEK);
    const slug = (acc?.data as any)?.workspaceSlug;
    if (!slug) {
      throw new BadRequestException('EasyWeek workspace slug is missing');
    }
    return String(slug);
  }

  //*** Bookings ***//

  async enqueueBookingsSync(salonId: string, provider?: CrmType): Promise<{ jobId: string }> {
    const resolvedProvider = provider ?? (await this.resolveSalonProvider(salonId));
    const jobId = await this.scheduler.scheduleSync({ salonId, provider: resolvedProvider }, { type: 'bookings' });
    return { jobId };
  }

  // Fan a dispatch tick out to per-salon jobs across all active CRM-linked salons. Best-effort: a
  // single salon failing to enqueue does not abort the rest. Draft salons (no externalSalonId) are
  // skipped. The SLOW lane also refreshes the catalog (categories/services/workers/salon) — those
  // run on their own queues/workers, isolated from the fast bookings lane. Fast = bookings-only.
  async dispatchLane(lane: Lane): Promise<{ enqueued: number; catalog: number; total: number }> {
    const salons = await this.prisma.salon.findMany({
      where: { deletedAt: null, provider: { not: null }, externalSalonId: { not: null } },
      select: { id: true, provider: true },
    });
    const includeCatalog = lane === 'slow';
    let enqueued = 0;
    let catalog = 0;
    for (const s of salons) {
      if (!s.provider) continue;
      const provider = s.provider as CrmType;
      try {
        await this.scheduler.scheduleSync({ salonId: s.id, provider, lane }, { type: 'bookings' });
        enqueued += 1;
      } catch (e) {
        this.log.warn('Failed to enqueue bookings lane job', {
          salonId: s.id,
          lane,
          error: String((e as any)?.message ?? e),
        });
      }
      if (includeCatalog) {
        try {
          // Own queues (crm-categories/services/workers/salons) — no lane/priority needed.
          await this.scheduler.scheduleSync({ salonId: s.id, provider }, { type: 'categories' });
          await this.scheduler.scheduleSync({ salonId: s.id, provider }, { type: 'services' });
          await this.scheduler.scheduleSync({ salonId: s.id, provider }, { type: 'workers' });
          await this.scheduler.scheduleSync({ salonId: s.id, provider }, { type: 'salon' });
          catalog += 1;
        } catch (e) {
          this.log.warn('Failed to enqueue catalog sync jobs', {
            salonId: s.id,
            error: String((e as any)?.message ?? e),
          });
        }
      }
    }
    this.log.info('Bookings dispatch fan-out', { lane, enqueued, catalog, total: salons.length });
    return { enqueued, catalog, total: salons.length };
  }

  async pullAltegioBookings(salonId: string, bookingIds: string[]) {
    return this.adapter.pullAltegioBookings(salonId, bookingIds);
  }

  async listAltegioRecords(
    salonId: string,
    params: { startDate?: string; endDate?: string; withDeleted?: boolean; count?: number },
  ) {
    return this.adapter.listAltegioRecords(salonId, params);
  }

  async pullEasyweekBookings(salonId: string, bookingIds: string[]) {
    return this.adapter.pullEasyweekBookings(salonId, bookingIds);
  }

  //*** Services ***//

  async enqueueServicesSync(salonId: string, provider: CrmType): Promise<{ jobId: string }> {
    const jobId = await this.scheduler.scheduleSync({ salonId, provider }, { type: 'services' });
    return { jobId };
  }

  async pullServices(salonId: string, provider: CrmType): Promise<Page<ServiceData>> {
    return this.adapter.pullServices(salonId, provider);
  }

  async createService(
    salonId: string,
    provider: CrmType,
    data: ServiceCreateInput,
  ): Promise<ServiceData> {
    return this.adapter.createService(salonId, provider, data);
  }

  async updateService(
    salonId: string,
    provider: CrmType,
    externalId: string,
    patch: ServiceUpdateInput,
  ): Promise<ServiceData> {
    return this.adapter.updateService(salonId, provider, externalId, patch);
  }

  async deleteService(salonId: string, provider: CrmType, externalId: string): Promise<void> {
    await this.adapter.deleteService(salonId, provider, externalId);
  }

  //*** Categories ***//

  async enqueueCategoriesSync(salonId: string, provider: CrmType): Promise<{ jobId: string }> {
    const jobId = await this.scheduler.scheduleSync({ salonId, provider }, { type: 'categories' });
    return { jobId };
  }

  async pullCategories(salonId: string, provider: CrmType): Promise<Page<CategoryData>> {
    return this.adapter.pullCategories(salonId, provider);
  }

  async createCategory(
    salonId: string,
    provider: CrmType,
    data: CategoryCreateInput,
  ): Promise<CategoryData> {
    return this.adapter.createCategory(salonId, provider, data);
  }

  async updateCategory(
    salonId: string,
    provider: CrmType,
    externalId: string,
    patch: CategoryUpdateInput,
  ): Promise<CategoryData> {
    return this.adapter.updateCategory(salonId, provider, externalId, patch);
  }

  async deleteCategory(salonId: string, provider: CrmType, externalId: string): Promise<void> {
    await this.adapter.deleteCategory(salonId, provider, externalId);
  }

  //*** Workers ***//

  async enqueueWorkersSync(salonId: string, provider: CrmType): Promise<{ jobId: string }> {
    const jobId = await this.scheduler.scheduleSync({ salonId, provider }, { type: 'workers' });
    return { jobId };
  }

  async pullWorkers(salonId: string, provider: CrmType): Promise<Page<WorkerData>> {
    return this.adapter.pullWorkers(salonId, provider);
  }

  async createWorker(salonId: string, provider: CrmType, data: WorkerCreateInput): Promise<WorkerData> {
    return this.adapter.createWorker(salonId, provider, data);
  }

  async updateWorker(salonId: string, provider: CrmType, externalId: string, patch: WorkerUpdateInput): Promise<WorkerData> {
    return this.adapter.updateWorker(salonId, provider, externalId, patch);
  }

  async deleteWorker(salonId: string, provider: CrmType, externalId: string): Promise<void> {
    await this.adapter.deleteWorker(salonId, provider, externalId);
  }

  //*** Helpers ***//

  async resolveSalonProvider(salonId: string): Promise<CrmType> {
    const salon = await this.prisma.salon.findUnique({ where: { id: salonId }, select: { provider: true } });
    if (!salon?.provider) {
      throw new BadRequestException('Salon is not linked to a CRM provider');
    }
    return salon.provider as CrmType;
  }

  private mapCrmErrorToHttpException(e: unknown): never {
    if (e instanceof CrmError) {
      const message = e.vendorMessage || e.message;
      switch (e.kind) {
        case ErrorKind.AUTH:
          throw new HttpException(message, HttpStatus.FAILED_DEPENDENCY);
        case ErrorKind.RATE_LIMIT:
          throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
        case ErrorKind.VALIDATION:
          throw new NotFoundException(message);
        case ErrorKind.NETWORK:
          throw new BadGatewayException(message);
        default:
          throw new BadRequestException(message);
      }
    }
    throw e;
  }

}
