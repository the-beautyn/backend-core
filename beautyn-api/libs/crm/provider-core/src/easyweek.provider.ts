import { ICrmProvider, ProviderContext, CreateBookingInput, RescheduleBookingInput, CancelBookingInput, CompleteBookingInput, GetAvailabilityInput, AvailabilitySlot, CategoryCreateInput, CategoryUpdateInput, ServiceCreateInput, ServiceUpdateInput } from './types';
import { CategoryData, ServiceData, WorkerData, WorkerSchedule, SalonData, Page, WorkingDay, formatWorkingSchedule, BookingData } from './dtos';
import { WorkerCreateInput, WorkerUpdateInput } from './types';
import * as EWSalon from './easyweek/salon';
import * as EWCategories from './easyweek/categories';
import * as EWServices from './easyweek/services';
import * as EWWorkers from './easyweek/workers';
import * as EWBookings from './easyweek/bookings';
import { TokenStorageService } from '@crm/token-storage';
import { AccountRegistryService } from '@crm/account-registry';
import { createChildLogger } from '@shared/logger';
import { CrmError, ErrorKind } from '@crm/shared';
import { AltegioBooking } from './altegio/bookings';
import { EasyWeekBooking } from './easyweek/bookings';

export class EasyWeekProvider implements ICrmProvider {
  public log = createChildLogger('provider.easyweek');
  public apiKey?: string;
  public workspaceSlug?: string;
  public locationId?: string;
  public readonly base = process.env.EASYWEEK_API_BASE?.trim() || 'https://my.easyweek.io/api/public/v2';

  constructor(
    private tokens: TokenStorageService,
    private accounts: AccountRegistryService,
  ) {}

  async init(ctx: ProviderContext): Promise<void> {
    // Secret from Token Storage
    const bundle = await this.tokens.get(ctx.salonId, ctx.provider);
    const apiKey = bundle?.apiKey;
    if (!apiKey) {
      throw new CrmError('Missing EasyWeek apiKey in Token Storage', { kind: ErrorKind.AUTH, retryable: false });
    }
    this.apiKey = apiKey;

    // Non-secrets from Account Registry
    const acc = await this.accounts.get(ctx.salonId, ctx.provider);
    const workspaceSlug = (acc?.data as any)?.workspaceSlug;
    const locationId = (acc?.data as any)?.locationId;
    if (!workspaceSlug || !locationId) {
      throw new CrmError('Missing EasyWeek workspaceSlug/locationId in Account Registry', { kind: ErrorKind.VALIDATION, retryable: false });
    }
    this.workspaceSlug = workspaceSlug;
    this.locationId = locationId;

    this.log.info('EasyWeek provider initialized', { salonId: ctx.salonId, workspaceSlug, locationId });
  }
  // Normalized pull (stubs)
  async pullSalon(): Promise<SalonData> {
    return EWSalon.pullSalon(this.ctx());
  }

  async pullAltegioBookings(bookingIds: string[]): Promise<Page<AltegioBooking>> {
    throw new CrmError('EasyWeek does not support AltegioBookings', { kind: ErrorKind.NOT_SUPPORTED, retryable: false });
  }

  async pullEasyWeekBookings(bookingIds: string[]): Promise<Page<EasyWeekBooking>> {
    return EWBookings.pullBookings(this.ctx(), bookingIds);
  }

  async pullWorkers(): Promise<Page<WorkerData>> {
    const workers = await EWWorkers.pullWorkers(this.ctx());
    this.log.info('Pulled workers from EasyWeek', { count: workers.items.length });
    return workers;
  }

  async fetchBooking(bookingUuid: string) {
    return EWBookings.fetchBooking(this.ctx(), bookingUuid);
  }

  async pullCategories(): Promise<Page<CategoryData>> {
    const page = await EWCategories.pullCategories(this.ctx());
    this.log.info('Pulled categories from EasyWeek', { count: page.items.length });
    return page;
  }

  async createCategory(data: CategoryCreateInput): Promise<CategoryData> {
    throw new CrmError('EasyWeek does not support category CRUD', { kind: ErrorKind.NOT_SUPPORTED, retryable: false });
  }

  async updateCategory(externalId: string, patch: CategoryUpdateInput): Promise<CategoryData> {
    throw new CrmError('EasyWeek does not support category CRUD', { kind: ErrorKind.NOT_SUPPORTED, retryable: false });
  }

  async deleteCategory(externalId: string): Promise<void> {
    throw new CrmError('EasyWeek does not support category CRUD', { kind: ErrorKind.NOT_SUPPORTED, retryable: false });
  }

  async pullServices(): Promise<Page<ServiceData>> {
    const page = await EWServices.pullServices(this.ctx());
    this.log.info('Pulled services from EasyWeek', { count: page.items.length });
    return page;
  }

  async createService(data: ServiceCreateInput): Promise<ServiceData> {
    throw new CrmError('EasyWeek does not support service CRUD', { kind: ErrorKind.NOT_SUPPORTED, retryable: false });
  }

  async updateService(externalId: string, patch: ServiceUpdateInput): Promise<ServiceData> {
    throw new CrmError('EasyWeek does not support service CRUD', { kind: ErrorKind.NOT_SUPPORTED, retryable: false });
  }

  async deleteService(externalId: string): Promise<void> {
    throw new CrmError('EasyWeek does not support service CRUD', { kind: ErrorKind.NOT_SUPPORTED, retryable: false });
  }

  async createWorker(data: WorkerCreateInput): Promise<WorkerData> {
    throw new CrmError('EasyWeek does not support worker CRUD', { kind: ErrorKind.NOT_SUPPORTED, retryable: false });
  }

  async updateWorker(externalId: string, patch: WorkerUpdateInput): Promise<WorkerData> {
    throw new CrmError('EasyWeek does not support worker CRUD', { kind: ErrorKind.NOT_SUPPORTED, retryable: false });
  }

  async deleteWorker(externalId: string): Promise<void> {
    throw new CrmError('EasyWeek does not support worker CRUD', { kind: ErrorKind.NOT_SUPPORTED, retryable: false });
  }

  private notYet(method: string): never {
    this.log.warn('Stub method called', { method, workspaceSlug: this.workspaceSlug, locationId: this.locationId });
    throw new CrmError('Not implemented', { kind: ErrorKind.INTERNAL, retryable: false });
  }

  // ---- internals ----
  public require<T>(v: T | undefined | null, name: string): T {
    if (v == null || (typeof v === 'string' && v.length === 0)) {
      throw new CrmError(`Missing ${name}`, { kind: ErrorKind.INTERNAL, retryable: false });
    }
    return v as T;
  }

  public headers(): Record<string, string> {
    const rawKey = this.require(this.apiKey, 'apiKey');
    const workspace = this.require(this.workspaceSlug, 'workspaceSlug');
    const auth = String(rawKey).startsWith('Bearer ')
      ? String(rawKey)
      : `Bearer ${String(rawKey)}`;
    return { Authorization: auth, Workspace: workspace, 'Content-Type': 'application/json' };
  }

  public async doFetch(url: string, opts: { method?: string; body?: any } = {}): Promise<any> {
    const init: any = { method: opts.method ?? 'GET', headers: this.headers() };
    if (opts.body != null) init.body = JSON.stringify(opts.body);
    const startedAt = Date.now();
    this.log.http?.('CRM EasyWeek → request', {
      method: init.method,
      url,
      headers: { Authorization: this.apiKey, Workspace: this.workspaceSlug },
      bodySize: typeof init.body === 'string' ? init.body.length : 0,
    });
    const res = await fetch(url, init);
    const durationMs = Date.now() - startedAt;
    const logFullBodies = process.env.CRM_LOG_BODIES === '1';
    let bodyText: string | undefined;
    try { bodyText = await res.clone().text(); } catch { bodyText = undefined; }
    this.log.http?.('CRM EasyWeek ← response', {
      method: init.method,
      url,
      status: res.status,
      ok: res.ok,
      durationMs,
      bodySize: bodyText?.length ?? 0,
      bodyPreview: !logFullBodies && bodyText ? bodyText.slice(0, 4000) : undefined,
    });
    if (res.status === 401 || res.status === 403) throw new CrmError('EasyWeek unauthorized', { kind: ErrorKind.AUTH, retryable: false });
    if (res.status === 429) throw new CrmError('EasyWeek rate limit', { kind: ErrorKind.RATE_LIMIT, retryable: true });
    if (!res.ok) throw new CrmError(`EasyWeek HTTP ${res.status}`, { kind: ErrorKind.NETWORK, retryable: res.status >= 500 });
    if (logFullBodies && bodyText) {
      try { return JSON.parse(bodyText); } catch { return bodyText; }
    }
    try { return await res.json(); } catch { return undefined; }
  }

  public async fetchAll(url: string): Promise<any[]> {
    const out: any[] = [];
    let next: string | null = url;
    while (next) {
      const data = await this.doFetch(next, { method: 'GET' });
      const arr = (data?.data ?? []) as any[];
      for (const it of arr) out.push(it);
      next = data?.links?.next || null;
    }
    return out;
  }

  public async findLocationById(): Promise<any | null> {
    const locationId = this.require(this.locationId, 'locationId');
    const list = await this.fetchAll(`${this.base}/locations`);
    return list.find((x: any) => String(x?.uuid) === String(locationId)) ?? null;
  }

  public mapSalon(loc: any): SalonData {
    const schedule: string | undefined = this.mapOpeningHours(loc?.opening_hours?.days);
    return {
      externalId: String(loc.uuid),
      name: String(loc.name ?? ''),
      description: loc.description ?? undefined,
      mainImageUrl: Array.isArray(loc.images) && loc.images.length ? String(loc.images[0]) : undefined,
      imageUrls: Array.isArray(loc.images) ? loc.images.map((u: any) => String(u)) : undefined,
      location: {
        country: '',
        city: loc?.address?.city ?? '',
        addressLine: loc?.address?.address_1 ?? '',
        lat: loc?.address?.position?.lat,
        lon: loc?.address?.position?.lng,
      },
      timezone: loc?.timezone?.name,
      workingSchedule: schedule,
    };
  }

  public mapOpeningHours(days: any): string | undefined {
    if (!days || typeof days !== 'object') return undefined;
    const dayMap: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
    const out: WorkingDay[] = [];
    for (const [k, intervals] of Object.entries(days)) {
      if (!Array.isArray(intervals) || !(k in dayMap)) continue;
      const first = intervals[0];
      if (!first) continue;
      out.push({ day: dayMap[k], opensAt: String(first.from), closesAt: String(first.to) } as WorkingDay);
    }
    return out.length ? formatWorkingSchedule(out) : undefined;
  }
  // Build a delegate context for the split EasyWeek modules
  private ctx() {
  return {
    log: this.log,
    base: this.base,
    workspaceSlug: this.workspaceSlug,
    locationId: this.locationId,
    require: this.require.bind(this),
    doFetch: this.doFetch.bind(this),
    fetchAll: this.fetchAll.bind(this),
    findLocationById: this.findLocationById.bind(this),
    mapSalon: this.mapSalon.bind(this),
  };
}
}
