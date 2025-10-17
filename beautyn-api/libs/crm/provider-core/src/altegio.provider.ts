import { ICrmProvider, ProviderContext, CreateBookingInput, RescheduleBookingInput, CancelBookingInput, CompleteBookingInput, GetAvailabilityInput, CategoryCreateInput, CategoryUpdateInput, ServiceCreateInput, ServiceUpdateInput, WorkerCreateInput, WorkerUpdateInput } from './types';
import { CategoryData, ServiceData, WorkerData, WorkerSchedule, SalonData, Page, BookingData } from './dtos';
import { AltegioContext } from './altegio/context';
import * as SalonBlock from './altegio/salon';
import * as CategoriesBlock from './altegio/categories';
import * as ServicesBlock from './altegio/services';
import * as WorkersBlock from './altegio/workers';
import * as BookingsBlock from './altegio/bookings';
import { AccountRegistryService } from '@crm/account-registry';
import { TokenStorageService } from '@crm/token-storage';
import { CrmType } from '@crm/shared';
import { createChildLogger } from '@shared/logger';
import { CrmError, ErrorKind } from '@crm/shared';

export class AltegioProvider implements ICrmProvider {
  private log = createChildLogger('provider.altegio');
  private externalSalonId?: number;
  private accessToken?: string;
  private userToken?: string;
  private baseUrl: string = process.env.ALTEGIO_API_BASE?.trim() || 'https://api.alteg.io';

  constructor(
    private accounts: AccountRegistryService,
    private tokens: TokenStorageService,
  ) {}

  async init(ctx: ProviderContext): Promise<void> {
    // Read non-secret account data
    const acc = await this.accounts.get(ctx.salonId, ctx.provider);
    const externalSalonId = (acc?.data as any)?.externalSalonId;
    if (typeof externalSalonId !== 'number') {
      throw new CrmError('Missing Altegio externalSalonId in Account Registry', { kind: ErrorKind.VALIDATION, retryable: false });
    }
    this.externalSalonId = externalSalonId;

    // Tokens come from Token Storage (dual‑token bundle)
    const bundle = await this.tokens.get(ctx.salonId, CrmType.ALTEGIO);
    const bearer = bundle?.accessToken;
    const user = bundle?.userToken;
    if (!bearer || !user) {
      throw new CrmError('Missing Altegio tokens in Token Storage', { kind: ErrorKind.AUTH, retryable: false });
    }
    this.accessToken = bearer;
    this.userToken = user;
  }

  // ---- HTTP helpers ----
  private headers(): Record<string, string> {
    if (!this.accessToken || !this.userToken) {
      throw new CrmError('Provider not initialized (missing tokens)', { kind: ErrorKind.INTERNAL, retryable: false });
    }
    return {
      'Accept': 'application/vnd.api.v2+json',
      'Authorization': `Bearer ${this.accessToken}, User ${this.userToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async http<T>(method: string, path: string, opts?: { query?: Record<string, any>; body?: any }): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (opts?.query) {
      for (const [k, v] of Object.entries(opts.query)) {
        if (v === undefined || v === null) continue;
        url.searchParams.set(k, String(v));
      }
    }
    const startedAt = Date.now();
    const headers = this.headers();
    this.log.http?.('CRM Altegio → request', {
      method,
      url: url.toString(),
      path: url.pathname,
      query: Object.fromEntries(url.searchParams.entries()),
      headers: "Bearer: 'bearer', User: 'user'" ,
      bodySize: opts?.body ? JSON.stringify(opts.body).length : 0,
    });
    const res = await fetch(url, {
      method,
      headers: headers,
      body: opts?.body ? JSON.stringify(opts.body) : undefined,
    } as any);

    const text = await res.text();
    let json: any;
    try { json = text ? JSON.parse(text) : undefined; } catch { json = undefined; }

    const durationMs = Date.now() - startedAt;
    const logFullBodies = process.env.CRM_LOG_BODIES === '1';
    this.log.http?.('CRM Altegio ← response', {
      method,
      path: url.pathname,
      status: res.status,
      ok: res.ok,
      durationMs,
      bodySize: text?.length ?? 0,
      body: logFullBodies ? (json ?? text) : undefined,
      bodyPreview: !logFullBodies && text ? text.slice(0, 4000) : undefined,
    });

    if (!res.ok) {
      const retryAfter = res.headers.get('retry-after') ?? undefined;
      const base = { status: res.status, path: url.pathname, retryAfter };
      if (res.status === 401 || res.status === 403) throw new CrmError('Altegio auth error', { kind: ErrorKind.AUTH, retryable: false, cause: base });
      if (res.status === 429) throw new CrmError('Altegio rate limit', { kind: ErrorKind.RATE_LIMIT, retryable: true, cause: base });
      if (res.status >= 500) throw new CrmError('Altegio server/network error', { kind: ErrorKind.NETWORK, retryable: true, cause: base });
      throw new CrmError(`Altegio request failed (${res.status})`, { kind: ErrorKind.VALIDATION, retryable: false, cause: { ...base, body: json ?? text } });
    }
    return (json?.data ?? json) as T;
  }

  private stripHtml(html?: string | null): string | undefined {
    if (!html) return undefined;
    return String(html).replace(/<[^>]+>/g, '').trim() || undefined;
  }

  // Sync
  async syncSalon(ctx: ProviderContext): Promise<SalonData> { 
    return this.pullSalon(ctx);
  }

  async syncCategories(ctx: ProviderContext): Promise<void> { /* no-op */ }
  async syncServices(ctx: ProviderContext): Promise<void> { /* no-op */ }
  async syncWorkers(ctx: ProviderContext): Promise<void> { /* no-op */ }
  async syncBookings(ctx: ProviderContext): Promise<void> { /* no-op */ }

  // Normalized pull
  async pullSalon(ctx: ProviderContext): Promise<SalonData> {
    return SalonBlock.pullSalon(this.ctx());
  }

  async pullBookings(
    ctx: ProviderContext,
    args?: { clientExternalId?: string; withDeleted?: boolean; startDate?: string; endDate?: string; page?: number; count?: number }
  ): Promise<BookingData[]> {
    return BookingsBlock.pullBookings(this.ctx(), args);
  }

  async pullCategories(ctx: ProviderContext, cursor?: string): Promise<Page<CategoryData>> {
    return CategoriesBlock.pullCategories(this.ctx());
  }

  async pullServices(ctx: ProviderContext, cursor?: string): Promise<Page<ServiceData>> {
    return ServicesBlock.pullServices(this.ctx());
  }

  async pullWorkers(ctx: ProviderContext, cursor?: string): Promise<WorkerData[]> {
    return WorkersBlock.pullWorkers(this.ctx());
  }

  // async createBooking(ctx: ProviderContext, payload: CreateBookingInput): Promise<{ externalBookingId: string }> {
  //   if (!this.externalSalonId) throw new CrmError('Provider not initialized (missing externalSalonId)', { kind: ErrorKind.INTERNAL, retryable: false });
  //   const services = Array.isArray((payload.extra as any)?.services)
  //     ? (payload.extra as any).services
  //     : payload.externalServiceId
  //       ? [{ id: Number(payload.externalServiceId), first_cost: (payload.extra as any)?.first_cost ?? (payload.extra as any)?.cost ?? 0, discount: (payload.extra as any)?.discount ?? 0, cost: (payload.extra as any)?.cost ?? 0 }]
  //       : [];
  //   if (!services.length) throw new CrmError('Missing services for Altegio booking create', { kind: ErrorKind.VALIDATION, retryable: false });
  //   const body = {
  //     staff_id: payload.externalWorkerId ? Number(payload.externalWorkerId) : undefined,
  //     services,
  //     client: payload.customer ? { phone: payload.customer.phone, name: payload.customer.name, email: payload.customer.email } : undefined,
  //     datetime: payload.startAtIso,
  //     seance_length: payload.durationMin ?? undefined,
  //     comment: payload.note ?? undefined,
  //   };
  //   const data = await this.http<any>('POST', `/api/v1/records/${this.externalSalonId}`, { body });
  //   const id = String(data?.id ?? data);
  //   if (!id) throw new CrmError('Altegio booking create: missing id in response', { kind: ErrorKind.INTERNAL, retryable: false });
  //   return { externalBookingId: id };
  // }

  // async rescheduleBooking(ctx: ProviderContext, payload: RescheduleBookingInput): Promise<void> {
  //   if (!this.externalSalonId) throw new CrmError('Provider not initialized (missing externalSalonId)', { kind: ErrorKind.INTERNAL, retryable: false });
  //   const body = { datetime: payload.newStartAtIso, comment: (payload.extra as any)?.comment ?? 'Rescheduled' };
  //   await this.http('PUT', `/api/v1/record/${this.externalSalonId}/${payload.externalBookingId}`, { body });
  // }

  // async cancelBooking(ctx: ProviderContext, payload: CancelBookingInput): Promise<void> {
  //   if (!this.externalSalonId) throw new CrmError('Provider not initialized (missing externalSalonId)', { kind: ErrorKind.INTERNAL, retryable: false });
  //   await this.http('DELETE', `/api/v1/record/${this.externalSalonId}/${payload.externalBookingId}`);
  // }

  // async completeBooking(ctx: ProviderContext, payload: CompleteBookingInput): Promise<void> {
  //   // Not documented for Altegio; keep as stub
  //   this.notYet('completeBooking');
  // }

  // async getAvailability(ctx: ProviderContext, input: GetAvailabilityInput): Promise<{ slots: { startIso: string; endIso: string; priceMinor?: number; quantity?: number; }; timezone?: string | undefined; currency?: string | undefined; }> {
  //   this.notYet('getAvailability');
  // }

  // CRUD
  // async updateSalon(ctx: ProviderContext, patch: Partial<Omit<SalonData, 'externalId'>>): Promise<void> {
  //   if (!this.externalSalonId) throw new CrmError('Provider not initialized (missing externalSalonId)', { kind: ErrorKind.INTERNAL, retryable: false });
  //   const body: any = {
  //     title: patch.name,
  //     address: patch.location?.addressLine,
  //     coordinate_lat: patch.location?.lat,
  //     coordinate_lon: patch.location?.lon,
  //     description: patch.description,
  //     short_descr: (patch as any)?.short_descr,
  //   };
  //   await this.http('PUT', `/api/v1/company/${this.externalSalonId}`, { body });
  // }

  async createCategory(ctx: ProviderContext, data: CategoryCreateInput): Promise<CategoryData> {
    return CategoriesBlock.createCategory(this.ctx(), data);
  }

  async updateCategory(ctx: ProviderContext, externalId: string, patch: CategoryUpdateInput): Promise<CategoryData> {
    return CategoriesBlock.updateCategory(this.ctx(), externalId, patch);
  }

  async deleteCategory(ctx: ProviderContext, externalId: string): Promise<void> {
    return CategoriesBlock.deleteCategory(this.ctx(), externalId);
  }

  async createService(ctx: ProviderContext, data: ServiceCreateInput): Promise<ServiceData> {
    return ServicesBlock.createService(this.ctx(), data);
  }

  async updateService(ctx: ProviderContext, externalId: string, patch: ServiceUpdateInput): Promise<ServiceData> {
    return ServicesBlock.updateService(this.ctx(), externalId, patch);
  }

  async deleteService(ctx: ProviderContext, externalId: string): Promise<void> {
    return ServicesBlock.deleteService(this.ctx(), externalId);
  }

  async createWorker(ctx: ProviderContext, data: WorkerCreateInput): Promise<WorkerData> {
    return WorkersBlock.createWorker(this.ctx(), data);
  }

  async updateWorker(ctx: ProviderContext, externalId: string, patch: WorkerUpdateInput): Promise<WorkerData> {
    return WorkersBlock.updateWorker(this.ctx(), externalId, patch);
  }

  async deleteWorker(ctx: ProviderContext, externalId: string): Promise<void> {
    return WorkersBlock.deleteWorker(this.ctx(), externalId);
  }
  // async updateWorkerSchedule(ctx: ProviderContext, externalId: string, schedule: WorkerSchedule): Promise<void> { this.notYet('updateWorkerSchedule'); }

  private notYet(method: string): never {
    this.log.warn('Stub method called', { method, externalSalonId: this.externalSalonId });
    throw new CrmError('Not implemented', { kind: ErrorKind.INTERNAL, retryable: false });
  }

  private ctx(): AltegioContext {
    return {
      log: this.log,
      baseUrl: this.baseUrl,
      externalSalonId: this.externalSalonId,
      http: this.http.bind(this),
      stripHtml: this.stripHtml.bind(this),
      requireExternalSalonId: () => {
        if (!this.externalSalonId) throw new CrmError('Provider not initialized (missing externalSalonId)', { kind: ErrorKind.INTERNAL, retryable: false });
        return this.externalSalonId;
      },
    };
  }
}
