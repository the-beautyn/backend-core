import { BadGatewayException, BadRequestException, HttpException, HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CrmError, CrmType, ErrorKind } from '@crm/shared';
import { AccountRegistryService } from '@crm/account-registry';
import { TokenStorageService } from '@crm/token-storage';
import { CrmAdapterService } from '@crm/adapter';
import { CrmSalonDiffService } from '../../crm-salon-changes/crm-salon-diff.service';
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
import type { AltegioBooking } from '@crm/provider-core/altegio/bookings';
import type { EasyWeekBooking } from '@crm/provider-core/easyweek/bookings';
import { SyncSchedulerService } from '@crm/sync-scheduler';
import { EasyweekBookingDtoNormalized } from './dto/easyweek-booking.dto';

@Injectable()
export class CrmIntegrationService {
  private readonly log = createChildLogger('crm-integration.service');
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountRegistryService,
    private readonly tokens: TokenStorageService,
    private readonly adapter: CrmAdapterService,
    private readonly salonDiff: CrmSalonDiffService,
    private readonly scheduler: SyncSchedulerService,
  ) {}

  private logger = new Logger(CrmIntegrationService.name);

  //* Public API *//

  //** CRM Connector **//
  
  // Creates a draft Salon linked to Altegio by external id and provider.
  // Further metadata and tokens should be stored in AccountRegistry/TokenStorage.
  async linkAltegio({ userId, externalSalonId }: { userId: string; externalSalonId: string }): Promise<{ salonId: string }> {
    const ext = String(externalSalonId);
    const existing = await this.prisma.salon.findFirst({ where: { ownerUserId: userId } });
    if (existing) {
      if (existing.externalSalonId === ext && existing.provider === CrmType.ALTEGIO) {
        return { salonId: existing.id };
      }
      await this.prisma.salon.delete({ where: { id: existing.id } });
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
    return { salonId: salon.id };
  }

  // Creates a draft Salon linked to EasyWeek by external id and provider.
  // workspaceSlug/auth are handled by AccountRegistry/TokenStorage; here we just persist the link anchor.
  async linkEasyWeek({ userId, authToken, workspaceSlug, externalSalonId }: { userId: string; authToken: string; workspaceSlug: string; externalSalonId: string }): Promise<{ salonId: string }> {
    const ext = String(externalSalonId);
    const existing = await this.prisma.salon.findFirst({ where: { ownerUserId: userId } });
    if (existing) {
      if (existing.externalSalonId === ext && existing.provider === CrmType.EASYWEEK) {
        return { salonId: existing.id };
      }
      await this.prisma.salon.delete({ where: { id: existing.id } });
    }
    const salon = await this.prisma.salon.create({
      data: { ownerUserId: userId, externalSalonId: ext, provider: CrmType.EASYWEEK },
      select: { id: true },
    });
    // Persist non-secret identifiers
    await this.accounts.setEasyWeek(salon.id, { workspaceSlug, locationId: ext });
    // Store secret/API key in Token Storage
    await this.tokens.store(salon.id, CrmType.EASYWEEK, { apiKey: authToken });
    return { salonId: salon.id };
  }

  //** CRM Sync Scheduler **//

  async enqueueInitialSync(salonId: string, provider: CrmType): Promise<{ jobId: string }> {
    const jobId = await this.scheduler.scheduleSync({ salonId, provider }, { type: 'initial' });
    return { jobId };
  }

  async runInitialPullNow(
    salonId: string,
  ): Promise<{
    categories: { items: any[]; upserted: number; deleted: number };
    services: { items: any[]; upserted: number; deleted: number };
    workers: { items: any[]; upserted: number; deleted: number };
  }> {
    const provider = await this.resolveSalonProvider(salonId);

    const categoriesResult = await this.rebaseCategoriesNow(salonId, provider);
    const servicesResult = await this.rebaseServicesNow(salonId, provider);
    const workersResult = await this.rebaseWorkersNow(salonId, provider);

    const [categoriesSnapshot, servicesSnapshot, workersSnapshot] = await Promise.all([
      this.loadFinalCategoriesSnapshot(salonId),
      this.loadFinalServicesSnapshot(salonId),
      this.loadFinalWorkersSnapshot(salonId),
    ]);

    return {
      categories: {
        items: categoriesSnapshot,
        upserted: categoriesResult.upserted ?? 0,
        deleted: categoriesResult.deleted ?? 0,
      },
      services: {
        items: servicesSnapshot,
        upserted: servicesResult.upserted ?? 0,
        deleted: servicesResult.deleted ?? 0,
      },
      workers: {
        items: workersSnapshot,
        upserted: workersResult.upserted ?? 0,
        deleted: workersResult.deleted ?? 0,
      },
    };
  }

  //*** Salon Sync ***//

  async pullSalonAndDetectChanges(salonId: string): Promise<SalonData> {
    const salon = await this.prisma.salon.findUnique({
      where: { id: salonId },
      select: { provider: true, externalSalonId: true, name: true },
    });
    if (!salon?.provider) {
      throw new BadRequestException('Salon is not linked to a CRM provider');
    }
    const provider = salon.provider as CrmType;
    const remote = await this.adapter.pullSalon(salonId, provider);
    const detectionPayload = this.prepareDetectionPayload(remote, {
      externalSalonId: salon.externalSalonId,
      name: salon.name,
    });
    await this.salonDiff.detectChanges(salonId, provider, detectionPayload);
    return remote;
  }

  async enqueueSalonSync(salonId: string, provider?: CrmType): Promise<{ jobId: string }> {
    const resolvedProvider = provider ?? (await this.resolveSalonProvider(salonId));
    const jobId = await this.scheduler.scheduleSync({ salonId, provider: resolvedProvider }, { type: 'salon' });
    return { jobId };
  }

  // --- Booking flow passthrough ---
  async bookServices(salonId: string, provider: CrmType, args?: { serviceIds?: number[]; staffId?: number }) {
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

  //*** Bookings Sync ***//

  async enqueueBookingsSync(salonId: string, provider?: CrmType): Promise<{ jobId: string }> {
    const resolvedProvider = provider ?? (await this.resolveSalonProvider(salonId));
    const jobId = await this.scheduler.scheduleSync({ salonId, provider: resolvedProvider }, { type: 'bookings' });
    return { jobId };
  }

  async syncBookingsNow(
    salonId: string,
    bookings: string[],
    provider: CrmType,
  ): Promise<BookingDto[]> {
    if (provider === CrmType.ALTEGIO) {
      const bookingsPage = await this.adapter.pullAltegioBookings(salonId, bookings);
      const bookingsPayload = this.prepareAltegioBookingsSyncPayload(bookingsPage?.items ?? []);
      return this.pushAltegioBookingsToInternal(salonId, bookingsPayload);
    } else if (provider === CrmType.EASYWEEK) {
      const bookingsPage = await this.adapter.pullEasyweekBookings(salonId, bookings);
      const bookingsPayload = this.prepareEasyweekBookingsSyncPayload(bookingsPage?.items ?? []);
      return this.pushEasyweekBookingsToInternal(salonId, bookingsPayload);
    }

    return [];
  }

  async rebaseBookingsNow(
    salonId: string,
    bookings: string[],
    provider: CrmType,
  ): Promise<BookingDto[]> {
    return this.syncBookingsNow(salonId, bookings, provider);
  }

  //*** Services Sync ***//

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

  async syncServicesNow(
    salonId: string,
    provider?: CrmType,
  ): Promise<{ services: any[]; upserted: number; deleted: number }> {
    const resolvedProvider = provider ?? (await this.resolveSalonProvider(salonId));
    const servicesPage = await this.adapter.pullServices(salonId, resolvedProvider);
    const servicesPayload = this.prepareServicesSyncPayload(servicesPage?.items ?? []);
    return this.pushServicesToInternal(salonId, servicesPayload);
  }

  async rebaseServicesNow(
    salonId: string,
    provider: CrmType,
  ): Promise<{ services: any[]; upserted: number; deleted: number }> {
    return this.syncServicesNow(salonId, provider);
  }

  //*** Categories Sync ***//

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

  async syncCategoriesNow(salonId: string, provider?: CrmType): Promise<{ categories: any[]; upserted: number; deleted: number }> {
    const resolvedProvider = provider ?? (await this.resolveSalonProvider(salonId));
    const page = await this.adapter.pullCategories(salonId, resolvedProvider);
    const payload = this.prepareCategoriesSyncPayload(page?.items ?? []);
    return this.pushCategoriesToInternal(salonId, payload);
  }

  async rebaseCategoriesNow(salonId: string, provider: CrmType): Promise<{ categories: any[]; upserted: number; deleted: number }> {
    return this.syncCategoriesNow(salonId, provider);
  }

  //*** Workers Sync ***//

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

  async syncWorkersNow(salonId: string, provider?: CrmType): Promise<{ workers: any[]; upserted: number; deleted: number }>  {
    const resolvedProvider = provider ?? (await this.resolveSalonProvider(salonId));
    const page = await this.adapter.pullWorkers(salonId, resolvedProvider);
    const payload = this.prepareWorkersSyncPayload(page?.items ?? []);
    return this.pushWorkersToInternal(salonId, payload);
  }

  async rebaseWorkersNow(
    salonId: string,
    provider: CrmType,
  ): Promise<{ workers: any[]; upserted: number; deleted: number }> {
    return this.syncWorkersNow(salonId, provider);
  }

  //*** Private Helpers ***//

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

  private async loadFinalCategoriesSnapshot(salonId: string): Promise<any[]> {
    const categories = await this.prisma.category.findMany({
      where: { salonId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return categories.map((category) => ({
      id: category.id,
      salonId: category.salonId,
      crmCategoryId: category.crmCategoryId ?? null,
      name: category.name,
      color: category.color ?? null,
      sortOrder: category.sortOrder ?? null,
      serviceIds: Array.isArray(category.serviceIds) ? category.serviceIds : [],
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    }));
  }

  private async loadFinalServicesSnapshot(salonId: string): Promise<any[]> {
    const services = await this.prisma.service.findMany({
      where: { salonId },
      include: { workerLinks: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return services.map((service) => {
      const workerIds =
        Array.isArray((service as any).workerLinks) && (service as any).workerLinks.length
          ? (service as any).workerLinks
              .map((link: { workerId?: string | null; remoteWorkerId?: string | null }) => link.workerId ?? link.remoteWorkerId)
              .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
          : [];

      return {
        id: service.id,
        salon_id: service.salonId,
        crm_service_id: service.crmServiceId ?? null,
        category_id: service.categoryId ?? null,
        name: service.name,
        description: service.description ?? null,
        duration: service.duration,
        price: service.price,
        currency: service.currency,
        is_active: service.isActive,
        sort_order: service.sortOrder ?? null,
        worker_ids: workerIds,
      };
    });
  }

  private async loadFinalWorkersSnapshot(salonId: string): Promise<any[]> {
    const workers = await this.prisma.worker.findMany({
      where: { salonId },
      include: { services: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    return workers.map((worker) => ({
      id: worker.id,
      crmWorkerId: worker.crmWorkerId ?? null,
      salonId: worker.salonId,
      firstName: worker.firstName,
      lastName: worker.lastName,
      position: worker.position ?? worker.role ?? null,
      description: worker.description ?? null,
      email: worker.email ?? null,
      phone: worker.phone ?? null,
      photoUrl: worker.photoUrl ?? null,
      serviceIds: Array.isArray(worker.services)
        ? worker.services
            .map((link: { serviceId?: string | null }) => link?.serviceId)
            .filter((id): id is string => typeof id === 'string' && id.length > 0)
        : [],
      isActive: worker.isActive,
      createdAt: worker.createdAt,
      updatedAt: worker.updatedAt,
    }));
  }

  async resolveSalonProvider(salonId: string): Promise<CrmType> {
    const salon = await this.prisma.salon.findUnique({ where: { id: salonId }, select: { provider: true } });
    if (!salon?.provider) {
      throw new BadRequestException('Salon is not linked to a CRM provider');
    }
    return salon.provider as CrmType;
  }

  private prepareCategoriesSyncPayload(categories: CategoryData[]): Array<{ crm_category_id: string; name: string; color?: string | null; sort_order?: number | null }> {
    return categories.map((category) => ({
      crm_category_id: String(category.externalId),
      name: String(category.name ?? ''),
      color: category.color ?? undefined,
      sort_order: category.sortOrder ?? undefined,
    }));
  }

  private async pushCategoriesToInternal(
    salonId: string,
    categories: Array<{ crm_category_id: string; name: string; color?: string | null; sort_order?: number | null }>,
  ): Promise<{ categories: any[]; upserted: number; deleted: number }> {
    const base = process.env.INTERNAL_API_BASE_URL?.trim();
    const key = process.env.INTERNAL_API_KEY?.trim();
    if (!base || !key) {
      throw new BadRequestException('Internal API base URL or key not configured');
    }
    
    const res = await fetch(`${base}/api/v1/internal/categories/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-key': key },
      body: JSON.stringify({ salon_id: salonId, categories }),
    } as any);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new BadRequestException(`Categories sync failed: ${res.status} ${text?.slice(0, 500)}`);
    }

    const body = await res.json().catch(() => ({} as any));
    const data = body?.data ?? body ?? {};
    const upserted = Number(data?.upserted ?? 0);
    const deleted = Number(data?.deleted ?? 0);
    const categoriesResult = (data?.categories ?? []) as any[];

    return { categories: categoriesResult, upserted, deleted };
  }

  private prepareWorkersSyncPayload(
    workers: WorkerData[],
  ): Array<{
    crmWorkerId?: string | null;
    firstName: string;
    lastName: string;
    position?: string | null;
    description?: string | null;
    email?: string | null;
    phone?: string | null;
    photoUrl?: string | null;
    isActive?: boolean;
  }> {
    return (workers ?? []).map((worker) => {
      const { firstName, lastName } = this.splitWorkerName(worker);
      return {
        crmWorkerId: worker.externalId ?? null,
        firstName,
        lastName,
        position: worker.position ?? null,
        description: worker.description ?? null,
        email: worker.email ?? null,
        phone: worker.phone ?? null,
        photoUrl: worker.photoUrl ?? null,
        isActive: worker.isActive ?? true,
      };
    });
  }

  private async pushWorkersToInternal(
    salonId: string,
    workers: Array<{
      crmWorkerId?: string | null;
      firstName: string;
      lastName: string;
      position?: string | null;
      description?: string | null;
      email?: string | null;
      phone?: string | null;
      photoUrl?: string | null;
      isActive?: boolean;
    }>,
  ): Promise<{ workers: any[]; upserted: number; deleted: number }> {
    const base = process.env.INTERNAL_API_BASE_URL?.trim();
    const key = process.env.INTERNAL_API_KEY?.trim();
    if (!base || !key) {
      throw new BadRequestException('Internal API base URL or key not configured');
    }

    const res = await fetch(`${base}/api/v1/internal/workers/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-key': key },
      body: JSON.stringify({ salonId, workers }),
    } as any);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new BadRequestException(`Workers sync failed: ${res.status} ${text?.slice(0, 500)}`);
    }

    const body = await res.json().catch(() => ({} as any));
    const data = body?.data ?? body ?? {};
    const upserted = Number(data?.upserted ?? 0);
    const deleted = Number(data?.deleted ?? 0);
    const workersResult = (data?.workers ?? []) as any[];

    return { workers: workersResult, upserted, deleted };
  }

  private splitWorkerName(worker: WorkerData): { firstName: string; lastName: string } {
    const first = ((worker as any).firstName ?? '').trim();
    const last = ((worker as any).lastName ?? '').trim();
    if (first || last) {
      return {
        firstName: first || 'Unknown',
        lastName: last || 'Worker',
      };
    }
    const name = (worker.name ?? '').trim();
    if (!name.length) {
      return { firstName: 'Unknown', lastName: 'Worker' };
    }
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: 'Worker' };
    }
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  }

  private prepareServicesSyncPayload(
    services: ServiceData[],
  ): Array<{
    crm_service_id: string;
    category_external_id?: string | null;
    name: string;
    description?: string | null;
    duration?: number;
    price?: number;
    currency: string;
    is_active?: boolean;
    sort_order?: number | null;
    worker_ids?: string[];
  }> {
    return (services || []).map((svc) => {
      const name = String(svc?.name ?? '').trim();
      const duration = typeof svc?.duration === 'number' ? Math.max(0, Math.round(svc.duration)) : undefined;
      const price = typeof svc?.price === 'number' ? svc.price : undefined;
      const currency = (svc?.currency ?? 'UAH').trim();

      return {
        crm_service_id: svc?.externalId,
        category_external_id: svc?.categoryExternalId ? String(svc.categoryExternalId) : undefined,
        name,
        description: svc?.description ?? undefined,
        duration: duration,
        // Leave seconds undefined when minutes is provided; receiver derives seconds from minutes when needed
        price,
        currency,
        is_active: svc?.isActive ?? undefined,
        sort_order: typeof svc?.sortOrder === 'number' ? svc.sortOrder : undefined,
        worker_ids: Array.isArray(svc?.workerExternalIds)
          ? svc.workerExternalIds.map((w) => String(w))
          : undefined,
      };
    });
  }

  private prepareAltegioBookingsSyncPayload(
    bookings: Array<AltegioBooking | BookingData | Record<string, any>>,
  ): AltegioBooking[] {
    return (bookings ?? []).map((b) => {
      const externalId =
        (b as any).crmRecordId ??
        (b as any).externalId ??
        (b as any).id ??
        ((b as any).raw && ((b as any).raw.id ?? (b as any).raw.recordId ?? (b as any).raw.crmRecordId)) ??
        null;

      const datetime = (b as any).datetime ?? (b as any).startAtIso ?? null;
      const date = (b as any).date ?? null;
      const durationMin =
        typeof (b as any).durationMin === 'number'
          ? (b as any).durationMin
          : typeof (b as any).seanceLength === 'number'
            ? Math.round((b as any).seanceLength / 60)
            : typeof (b as any).length === 'number'
              ? Math.round((b as any).length / 60)
              : null;

      return {
        crmRecordId: externalId ? String(externalId) : undefined,
        companyId: (b as any).companyId ?? null,
        staffId: (b as any).staffId ?? (b as any).workerExternalId ?? null,
        clientId: (b as any).clientId ?? null,
        datetime: datetime ? String(datetime) : null,
        date: date ? String(date) : null,
        comment: (b as any).comment ?? (b as any).note ?? null,
        attendance: (b as any).attendance ?? null,
        confirmed: (b as any).confirmed ?? null,
        visitAttendance: (b as any).visitAttendance ?? null,
        length: (b as any).length ?? null,
        seanceLength:
          typeof (b as any).seanceLength === 'number'
            ? (b as any).seanceLength
            : typeof durationMin === 'number'
              ? durationMin * 60
              : null,
        isDeleted: (b as any).isDeleted ?? (b as any).deleted ?? null,
        staff: (b as any).staff ?? null,
        client: (b as any).client ?? null,
        services: (b as any).services ?? null,
        documents: (b as any).documents ?? null,
        goodsTransactions: (b as any).goodsTransactions ?? null,
        raw: (b as any).raw ?? b ?? null,
      } as AltegioBooking;
    });
  }

  private prepareEasyweekBookingsSyncPayload(
    bookings: Array<EasyWeekBooking | Record<string, any>>,
  ): EasyWeekBooking[] {
    return (bookings ?? []).map((b) => {
      const links = Array.isArray((b as any).links) ? (b as any).links : [];
      const duration = (b as any).duration ?? null;
      const orderedServices = Array.isArray((b as any).orderedServices) ? (b as any).orderedServices : [];
      const order = (b as any).order ?? null;

      return {
        uuid: (b as any).uuid ?? (b as any).externalId ?? '',
        locationUuid: (b as any).locationUuid ?? (b as any).location_uuid ?? null,
        startTime: (b as any).startTime ?? (b as any).start_time ?? null,
        endTime: (b as any).endTime ?? (b as any).end_time ?? null,
        timezone: (b as any).timezone ?? null,
        isCanceled: (b as any).isCanceled ?? (b as any).is_canceled ?? undefined,
        isCompleted: (b as any).isCompleted ?? (b as any).is_completed ?? undefined,
        statusName: (b as any).statusName ?? (b as any).status?.name ?? null,
        publicNotes: (b as any).publicNotes ?? (b as any).public_notes ?? null,
        orderedServices,
        order,
        duration,
        policy: (b as any).policy ?? null,
        links,
        raw: (b as any).raw ?? b ?? null,
      } as EasyWeekBooking;
    });
  }

  private async pushServicesToInternal(
    salonId: string,
    services: Array<{
      crm_service_id: string;
      category_external_id?: string | null;
      name: string;
      description?: string | null;
      duration?: number;
      price?: number;
      currency: string;
      is_active?: boolean;
      sort_order?: number | null;
      worker_ids?: string[];
    }>,
  ): Promise<{ services: any[]; upserted: number; deleted: number }> {
    const base = process.env.INTERNAL_API_BASE_URL?.trim();
    const key = process.env.INTERNAL_API_KEY?.trim();
    if (!base || !key) {
      throw new BadRequestException('Internal API base URL or key not configured');
    }
    
    const res = await fetch(`${base}/api/v1/internal/services/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-key': key },
      body: JSON.stringify({ salon_id: salonId, services }),
    } as any);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new BadRequestException(`Services sync failed: ${res.status} ${text?.slice(0, 500)}`);
    }

    const body = await res.json().catch(() => ({} as any));
    const data = body?.data ?? body ?? {};
    const upserted = Number(data?.upserted ?? 0);
    const deleted = Number(data?.deleted ?? 0);
    const servicesResult = (data?.services ?? []) as any[];

    return { services: servicesResult, upserted, deleted };
  }

  private async pushAltegioBookingsToInternal(
    salonId: string,
    bookings: AltegioBooking[],
  ): Promise<BookingDto[]> {
    const base = process.env.INTERNAL_API_BASE_URL?.trim();
    const key = process.env.INTERNAL_API_KEY?.trim();
    if (!base || !key) {
      throw new BadRequestException('Internal API base URL or key not configured');
    }

    const res = await fetch(`${base}/api/v1/internal/bookings/altegio/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-key': key },
      body: JSON.stringify({ salon_id: salonId, bookings }),
    } as any);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new BadRequestException(`Bookings sync failed (altegio): ${res.status} ${text?.slice(0, 500)}`);
    }

    const body = await res.json().catch(() => ({} as any));
    const data = body?.data ?? body ?? {};

    return data;
  }

  private async pushEasyweekBookingsToInternal(
    salonId: string,
    bookings: EasyWeekBooking[],
  ): Promise<BookingDto[]> {
    const base = process.env.INTERNAL_API_BASE_URL?.trim();
    const key = process.env.INTERNAL_API_KEY?.trim();
    if (!base || !key) {
      throw new BadRequestException('Internal API base URL or key not configured');
    }

    const res = await fetch(`${base}/api/v1/internal/bookings/easyweek/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-key': key },
      body: JSON.stringify({ salon_id: salonId, bookings }),
    } as any);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new BadRequestException(`Bookings sync failed (easyweek): ${res.status} ${text?.slice(0, 500)}`);
    }

    const body = await res.json().catch(() => ({} as any));
    const data = body?.data ?? body ?? {};

    return data;
  }

  private prepareDetectionPayload(remote: SalonData, fallback: { externalSalonId?: string | null; name?: string | null }): SalonData {
    const payload: SalonData = {
      externalId: remote.externalId ?? fallback.externalSalonId ?? '',
      name: remote.name ?? fallback.name ?? '',
    };

    if (remote.description !== undefined) payload.description = remote.description;
    if (remote.mainImageUrl !== undefined) payload.mainImageUrl = remote.mainImageUrl;
    if (remote.imageUrls) payload.imageUrls = remote.imageUrls.slice();
    if (remote.location) {
      payload.location = {
        country: remote.location.country,
        city: remote.location.city,
        addressLine: remote.location.addressLine,
        lat: remote.location.lat,
        lon: remote.location.lon,
      };
    }
    if (remote.workingSchedule !== undefined) payload.workingSchedule = remote.workingSchedule;
    if (remote.timezone !== undefined) payload.timezone = remote.timezone;
    if (remote.phone !== undefined) payload.phone = remote.phone;

    return payload;
  }
}
