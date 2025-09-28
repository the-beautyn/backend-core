import { ICrmProvider, ProviderContext, CreateBookingInput, RescheduleBookingInput, CancelBookingInput, CompleteBookingInput, GetAvailabilityInput, CategoryCreateInput, CategoryUpdateInput } from './types';
import { CategoryData, ServiceData, WorkerData, WorkerSchedule, SalonData, Page, BookingData } from './dtos';
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
    if (!this.externalSalonId) throw new CrmError('Provider not initialized (missing externalSalonId)', { kind: ErrorKind.INTERNAL, retryable: false });
    const c = await this.http<any>('GET', `/api/v1/company/${this.externalSalonId}`);
    const gallery: string[] = c?.company_photos || [];
    const mainImage = c?.logo || gallery[0];
    const out: SalonData = {
      externalId: String(c.id),
      name: c.public_title || c.title || 'Salon',
      description: this.stripHtml(c.description),
      mainImageUrl: mainImage,
      imageUrls: gallery,
      location: {
        country: c.country ?? '',
        city: c.city ?? '',
        addressLine: c.address ?? '',
        lat: c.coordinate_lat ?? undefined,
        lon: c.coordinate_lon ?? undefined,
      },
      workingSchedule: c.schedule ?? undefined,
      timezone: c.timezone_name ?? undefined,
    };
    return out;
  }

  async pullBookings(
    ctx: ProviderContext,
    args?: { clientExternalId?: string; withDeleted?: boolean; startDate?: string; endDate?: string; page?: number; count?: number }
  ): Promise<BookingData[]> {
    if (!this.externalSalonId) throw new CrmError('Provider not initialized (missing externalSalonId)', { kind: ErrorKind.INTERNAL, retryable: false });
    const query: Record<string, any> = {};
    if (args?.clientExternalId) query.client_id = args.clientExternalId;
    if (args?.withDeleted !== undefined) query.with_deleted = args.withDeleted ? 1 : 0;
    if (args?.startDate) query.start_date = args.startDate;
    if (args?.endDate) query.end_date = args.endDate;
    if (args?.page && args?.page > 0) query.page = args.page;
    if (args?.count && args?.count > 0) query.count = args.count;
    const items = await this.http<any[]>('GET', `/api/v1/records/${this.externalSalonId}`, { query });
    const mapped: BookingData[] = (items || []).map((b: any) => ({
      externalId: String(b.id),
      startAtIso: b.datetime,
      durationMin: b.seance_length ?? undefined,
      note: b.comment ?? undefined,
      isDeleted: !!b.is_deleted,
      workerExternalId: b.staff?.id ? String(b.staff.id) : undefined,
      serviceExternalIds: Array.isArray(b.services) ? b.services.map((s: any) => String(s?.id)).filter(Boolean) : undefined,
    }));
    return mapped;
  }

  async pullCategories(ctx: ProviderContext, cursor?: string): Promise<Page<CategoryData>> {
    if (!this.externalSalonId) throw new CrmError('Provider not initialized (missing externalSalonId)', { kind: ErrorKind.INTERNAL, retryable: false });
    const items = await this.http<any[]>('GET', `/api/v1/company/${this.externalSalonId}/service_categories`);
    const mapped: CategoryData[] = (items || []).map((x: any) => ({
      externalId: String(x.id),
      name: x.title,
      sortOrder: typeof x.weight === 'number' ? Number(x.weight) : null,
      isActive: true,
    }));
    return { items: mapped, fetched: mapped.length };
  }

  private async pullServices(ctx: ProviderContext, cursor?: string): Promise<Page<ServiceData>> {
    if (!this.externalSalonId) throw new CrmError('Provider not initialized (missing externalSalonId)', { kind: ErrorKind.INTERNAL, retryable: false });
    const items = await this.http<any[]>('GET', `/api/v1/company/${this.externalSalonId}/services`);
    const mapped: ServiceData[] = (items || []).map((s: any) => ({
      externalId: String(s.id),
      name: s.title,
      durationMin: s.seance_length ?? 0,
      priceMinor: typeof s.price_min === 'number' ? s.price_min : 0,
      currency: 'RUB',
      categoryExternalId: String(s.category_id ?? ''),
      description: s.description ? this.stripHtml(s.description) : undefined,
      isActive: true,
    }));
    return { items: mapped, fetched: mapped.length };
  }

  private async pullWorkers(ctx: ProviderContext, cursor?: string): Promise<Page<WorkerData>> {
    if (!this.externalSalonId) throw new CrmError('Provider not initialized (missing externalSalonId)', { kind: ErrorKind.INTERNAL, retryable: false });
    const items = await this.http<any[]>('GET', `/api/v1/company/${this.externalSalonId}/staff`);
    const mapped: WorkerData[] = (items || []).map((w: any) => ({
      externalId: String(w.id),
      name: w.name,
      position: w.specialization,
      photoUrl: w.avatar_big || w.avatar || undefined,
      email: w.email || undefined,
      phone: w.phone || undefined,
      isActive: w.is_bookable ?? true,
    }));
    return { items: mapped, fetched: mapped.length };
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
    if (!this.externalSalonId) throw new CrmError('Provider not initialized (missing externalSalonId)', { kind: ErrorKind.INTERNAL, retryable: false });
    const body: any = { title: data.title };
    if (data.weight !== undefined && data.weight !== null) {
      body.weight = data.weight;
    }
    const res = await this.http<any>('POST', `/api/v1/service_categories/${this.externalSalonId}`, { body });
    const externalId = String(res?.id ?? res?.data?.id ?? res);
    return {
      externalId,
      name: data.title,
      sortOrder: data.weight ?? null,
      color: null,
      isActive: true,
    };
  }

  async updateCategory(ctx: ProviderContext, externalId: string, patch: CategoryUpdateInput): Promise<CategoryData> {
    if (!this.externalSalonId) throw new CrmError('Provider not initialized (missing externalSalonId)', { kind: ErrorKind.INTERNAL, retryable: false });
    const body: any = {};
    if (patch.title !== undefined) body.title = patch.title;
    if (patch.weight !== undefined) body.weight = patch.weight;
    if (patch.staff !== undefined) body.staff = patch.staff;
    await this.http('PUT', `/api/v1/service_category/${this.externalSalonId}/${externalId}`, { body });
    return {
      externalId: String(externalId),
      name: patch.title ?? '',
      sortOrder: patch.weight ?? null,
      color: null,
      isActive: true,
    };
    }

  async deleteCategory(ctx: ProviderContext, externalId: string): Promise<void> {
    if (!this.externalSalonId) throw new CrmError('Provider not initialized (missing externalSalonId)', { kind: ErrorKind.INTERNAL, retryable: false });
    await this.http('DELETE', `/api/v1/service_category/${this.externalSalonId}/${externalId}`);
  }

  // async createService(ctx: ProviderContext, data: Omit<ServiceData, 'externalId' | 'updatedAtIso'> & { clientId?: string }): Promise<{ externalId: string }> { this.notYet('createService'); }
  // async updateService(ctx: ProviderContext, externalId: string, patch: Partial<Omit<ServiceData, 'externalId'>>): Promise<void> { this.notYet('updateService'); }
  // async deleteService(ctx: ProviderContext, externalId: string): Promise<void> { this.notYet('deleteService'); }

  // async createWorker(ctx: ProviderContext, data: Omit<WorkerData, 'externalId' | 'updatedAtIso'> & { clientId?: string }): Promise<{ externalId: string }> { this.notYet('createWorker'); }
  // async updateWorker(ctx: ProviderContext, externalId: string, patch: Partial<Omit<WorkerData, 'externalId'>>): Promise<void> { this.notYet('updateWorker'); }
  // async deleteWorker(ctx: ProviderContext, externalId: string): Promise<void> { this.notYet('deleteWorker'); }
  // async updateWorkerSchedule(ctx: ProviderContext, externalId: string, schedule: WorkerSchedule): Promise<void> { this.notYet('updateWorkerSchedule'); }

  private notYet(method: string): never {
    this.log.warn('Stub method called', { method, externalSalonId: this.externalSalonId });
    throw new CrmError('Not implemented', { kind: ErrorKind.INTERNAL, retryable: false });
  }
}
