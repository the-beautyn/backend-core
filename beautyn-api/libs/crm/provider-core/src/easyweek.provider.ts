import { ICrmProvider, ProviderContext, CreateBookingInput, RescheduleBookingInput, CancelBookingInput, CompleteBookingInput, GetAvailabilityInput, AvailabilitySlot } from './types';
import { CategoryData, ServiceData, WorkerData, WorkerSchedule, SalonData, Page, WorkingDay, formatWorkingSchedule, BookingData } from './dtos';
import { TokenStorageService } from '@crm/token-storage';
import { AccountRegistryService } from '@crm/account-registry';
import { createChildLogger } from '@shared/logger';
import { CrmError, ErrorKind } from '@crm/shared';

export class EasyWeekProvider implements ICrmProvider {
  private log = createChildLogger('provider.easyweek');
  private apiKey?: string;
  private workspaceSlug?: string;
  private locationId?: string;
  private readonly base = 'https://my.easyweek.io/api/public/v2';

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

  // async syncSalon(ctx: ProviderContext): Promise<void> { this.notYet('syncSalon'); }
  // async syncCategories(ctx: ProviderContext): Promise<void> { this.notYet('syncCategories'); }
  // async syncServices(ctx: ProviderContext): Promise<void> { this.notYet('syncServices'); }
  // async syncWorkers(ctx: ProviderContext): Promise<void> { this.notYet('syncWorkers'); }

  // Normalized pull (stubs)
  async pullSalon(ctx: ProviderContext): Promise<SalonData> {
    const loc = await this.findLocationById();
    if (!loc) throw new CrmError('EasyWeek location not found', { kind: ErrorKind.VALIDATION, retryable: false });
    return this.mapSalon(loc);
  }

  async pullBookings(ctx: ProviderContext, args?: { clientExternalId?: string; withDeleted?: boolean; startDate?: string; endDate?: string; }): Promise<BookingData[]> {
    this.notYet('pullBookings');
  }

  async syncSalon(ctx: ProviderContext): Promise<SalonData> { return this.pullSalon(ctx); };
  async syncCategories(ctx: ProviderContext): Promise<void> { this.notYet('syncCategories'); }
  async syncServices(ctx: ProviderContext): Promise<void> { this.notYet('syncServices'); }
  async syncWorkers(ctx: ProviderContext): Promise<void> { this.notYet('syncWorkers'); }
  async syncBookings(ctx: ProviderContext, args: { clientExternalId?: string; withDeleted?: boolean; startDate?: string; endDate?: string }): Promise<void> { 
    this.notYet('syncBookings');
  }
  // async pullCategories(ctx: ProviderContext, cursor?: string): Promise<Page<CategoryData>> {
  //   const locationId = this.require(this.locationId, 'locationId');
  //   const data = await this.fetchAll(`${this.base}/locations/${encodeURIComponent(locationId)}/service-categories`);
  //   const items: CategoryData[] = data.map((c: any) => ({
  //     externalId: String(c.uuid),
  //     name: String(c.name ?? ''),
  //     isActive: true,
  //     updatedAtIso: undefined,
  //   }));
  //   return { items, fetched: items.length };
  // }
  // async pullServices(ctx: ProviderContext, cursor?: string): Promise<Page<ServiceData>> {
  //   const locationId = this.require(this.locationId, 'locationId');
  //   const data = await this.fetchAll(`${this.base}/locations/${encodeURIComponent(locationId)}/services`);
  //   const items: ServiceData[] = data.map((s: any) => ({
  //     externalId: String(s.uuid),
  //     name: String(s.name ?? ''),
  //     description: s.description ?? undefined,
  //     currency: String(s.currency ?? 'USD'),
  //     priceMinor: Number(s.price ?? 0),
  //     durationMin: Number(s?.duration?.value ?? 0),
  //     categoryExternalId: s?.category?.uuid ? String(s.category.uuid) : undefined as any,
  //     isActive: true,
  //   }));
  //   return { items, fetched: items.length };
  // }
  // async pullWorkers(ctx: ProviderContext, cursor?: string): Promise<Page<WorkerData>> {
  //   const locationId = this.require(this.locationId, 'locationId');
  //   const data = await this.fetchAll(`${this.base}/locations/${encodeURIComponent(locationId)}/staffers`);
  //   const items: WorkerData[] = data.map((w: any) => ({
  //     externalId: String(w.uuid),
  //     name: [w.first_name, w.last_name].filter(Boolean).join(' ').trim(),
  //     position: w.position ?? undefined,
  //     description: w.description ?? undefined,
  //     photoUrl: w.avatar ?? undefined,
  //     isActive: true,
  //   }));
  //   return { items, fetched: items.length };
  // }

  // async createBooking(ctx: ProviderContext, payload: CreateBookingInput): Promise<{ externalBookingId: string }> {
  //   const locationId = this.require(this.locationId, 'locationId');
  //   const body: any = {
  //     staffer_uuid: payload.externalWorkerId,
  //     reserved_on: payload.startAtIso,
  //     location_uuid: locationId,
  //     service_uuid: payload.externalServiceId,
  //     customer_phone: payload.customer?.phone,
  //     customer_first_name: payload.customer?.name?.split(' ')[0],
  //     customer_last_name: payload.customer?.name?.split(' ').slice(1).join(' ') || undefined,
  //     customer_email: payload.customer?.email,
  //     booking_comment: payload.note,
  //     timezone: (payload.extra as any)?.timezone,
  //   };
  //   const res = await this.doFetch(`${this.base}/bookings`, { method: 'POST', body });
  //   const uuid = String(res?.data?.uuid ?? '');
  //   if (!uuid) throw new CrmError('EasyWeek createBooking: missing uuid', { kind: ErrorKind.INTERNAL, retryable: false });
  //   return { externalBookingId: uuid };
  // }
  // async rescheduleBooking(ctx: ProviderContext, payload: RescheduleBookingInput): Promise<void> { this.notYet('rescheduleBooking'); }
  // async cancelBooking(ctx: ProviderContext, payload: CancelBookingInput): Promise<void> {
  //   const bookingId = this.require(payload.externalBookingId, 'externalBookingId');
  //   const body: any = {
  //     cancel_reason: payload.reason ?? 'customer_request',
  //     internal_notes: (payload.extra as any)?.internal_notes,
  //     staffer_uuid: (payload.extra as any)?.staffer_uuid,
  //   };
  //   await this.doFetch(`${this.base}/bookings/${encodeURIComponent(bookingId)}/status/cancel`, { method: 'PUT', body });
  // }
  // async completeBooking(ctx: ProviderContext, payload: CompleteBookingInput): Promise<void> {
  //   const bookingId = this.require(payload.externalBookingId, 'externalBookingId');
  //   const body: any = {
  //     account_uuid: payload.accountExternalId,
  //     staffer_uuid: payload.stafferExternalId,
  //     internal_notes: payload.internalNotes,
  //     paid_amount: payload.paidAmountMinor,
  //   };
  //   await this.doFetch(`${this.base}/bookings/${encodeURIComponent(bookingId)}/status/complete`, { method: 'PUT', body });
  // }

  // async getAvailability(ctx: ProviderContext, input: GetAvailabilityInput): Promise<{ slots: AvailabilitySlot[]; timezone?: string; currency?: string }> {
  //   const locationId = this.require(this.locationId, 'locationId');
  //   const qs = new URLSearchParams();
  //   qs.set('service_uuid', this.require(input.externalServiceId, 'externalServiceId'));
  //   if (input.externalWorkerId) qs.set('staffer_uuid', input.externalWorkerId);
  //   if (input.rangeStartIso) qs.set('range_start', input.rangeStartIso);
  //   if (input.rangeEndIso) qs.set('range_end', input.rangeEndIso);
  //   if (input.timezone) qs.set('timezone', input.timezone);
  //   const res = await this.doFetch(`${this.base}/locations/${encodeURIComponent(locationId)}/time-slots?${qs.toString()}`, { method: 'GET' });
  //   const data = res?.data ?? {};
  //   const slots: AvailabilitySlot[] = [];
  //   for (const d of data?.dates ?? []) {
  //     for (const s of d?.slots ?? []) {
  //       slots.push({ startIso: s.start, endIso: s.end, priceMinor: s.price, quantity: s.quantity });
  //     }
  //   }
  //   return { slots, timezone: data?.timezone, currency: data?.currency };
  // }

  // // CRUD stubs
  // async updateSalon(ctx: ProviderContext, patch: Partial<Omit<SalonData, 'externalId'>>): Promise<void> { this.notYet('updateSalon'); }

  // async createCategory(ctx: ProviderContext, data: Omit<CategoryData, 'externalId' | 'updatedAtIso'> & { clientId?: string }): Promise<{ externalId: string }> { this.notYet('createCategory'); }
  // async updateCategory(ctx: ProviderContext, externalId: string, patch: Partial<Omit<CategoryData, 'externalId'>>): Promise<void> { this.notYet('updateCategory'); }
  // async deleteCategory(ctx: ProviderContext, externalId: string): Promise<void> { this.notYet('deleteCategory'); }

  // async createService(ctx: ProviderContext, data: Omit<ServiceData, 'externalId' | 'updatedAtIso'> & { clientId?: string }): Promise<{ externalId: string }> { this.notYet('createService'); }
  // async updateService(ctx: ProviderContext, externalId: string, patch: Partial<Omit<ServiceData, 'externalId'>>): Promise<void> { this.notYet('updateService'); }
  // async deleteService(ctx: ProviderContext, externalId: string): Promise<void> { this.notYet('deleteService'); }

  // async createWorker(ctx: ProviderContext, data: Omit<WorkerData, 'externalId' | 'updatedAtIso'> & { clientId?: string }): Promise<{ externalId: string }> { this.notYet('createWorker'); }
  // async updateWorker(ctx: ProviderContext, externalId: string, patch: Partial<Omit<WorkerData, 'externalId'>>): Promise<void> { this.notYet('updateWorker'); }
  // async deleteWorker(ctx: ProviderContext, externalId: string): Promise<void> { this.notYet('deleteWorker'); }
  // async updateWorkerSchedule(ctx: ProviderContext, externalId: string, schedule: WorkerSchedule): Promise<void> { this.notYet('updateWorkerSchedule'); }

  private notYet(method: string): never {
    this.log.warn('Stub method called', { method, workspaceSlug: this.workspaceSlug, locationId: this.locationId });
    throw new CrmError('Not implemented', { kind: ErrorKind.INTERNAL, retryable: false });
  }

  // ---- internals ----
  private require<T>(v: T | undefined | null, name: string): T {
    if (v == null || (typeof v === 'string' && v.length === 0)) {
      throw new CrmError(`Missing ${name}`, { kind: ErrorKind.INTERNAL, retryable: false });
    }
    return v as T;
  }

  private headers(): Record<string, string> {
    const auth = this.require("Bearer " + this.apiKey, 'apiKey');
    const workspace = this.require(this.workspaceSlug, 'workspaceSlug');
    return { Authorization: auth, Workspace: workspace, 'Content-Type': 'application/json' };
  }

  private async doFetch(url: string, opts: { method?: string; body?: any } = {}): Promise<any> {
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

  private async fetchAll(url: string): Promise<any[]> {
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

  private async findLocationById(): Promise<any | null> {
    const locationId = this.require(this.locationId, 'locationId');
    const list = await this.fetchAll(`${this.base}/locations`);
    return list.find((x: any) => String(x?.uuid) === String(locationId)) ?? null;
  }

  private mapSalon(loc: any): SalonData {
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

  private mapOpeningHours(days: any): string | undefined {
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
}
