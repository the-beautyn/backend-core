import { ICrmProvider, ProviderContext, CreateBookingInput, RescheduleBookingInput, CancelBookingInput, CompleteBookingInput, GetAvailabilityInput, CategoryCreateInput, CategoryUpdateInput, ServiceCreateInput, ServiceUpdateInput, WorkerCreateInput, WorkerUpdateInput } from './types';
import { CategoryData, ServiceData, WorkerData, WorkerSchedule, SalonData, Page, BookingData } from './dtos';
import { AltegioContext } from './altegio/context';
import * as SalonBlock from './altegio/salon';
import * as CategoriesBlock from './altegio/categories';
import * as ServicesBlock from './altegio/services';
import * as WorkersBlock from './altegio/workers';
import * as BookingsBlock from './altegio/bookings';
import * as BookingFlow from './altegio/booking-flow';
import { AccountRegistryService } from '@crm/account-registry';
import { TokenStorageService } from '@crm/token-storage';
import { CrmType } from '@crm/shared';
import { createChildLogger } from '@shared/logger';
import { CrmError, ErrorKind } from '@crm/shared';
import { EasyWeekBooking } from './easyweek/bookings';
import { AltegioBooking } from './altegio/bookings';

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
        if (Array.isArray(v)) {
          for (const item of v) {
            if (item === undefined || item === null) continue;
            url.searchParams.append(k, String(item));
          }
        } else {
          url.searchParams.set(k, String(v));
        }
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
      const base = { status: res.status, path: url.pathname, retryAfter, body: json ?? text };
      const vendorMessage = (json as any)?.meta?.message ?? (json as any)?.message ?? undefined;
      if (res.status === 401 || res.status === 403) throw new CrmError('Altegio auth error', { kind: ErrorKind.AUTH, retryable: false, cause: base, vendorMessage });
      if (res.status === 429) throw new CrmError('Altegio rate limit', { kind: ErrorKind.RATE_LIMIT, retryable: true, cause: base, vendorMessage });
      if (res.status >= 500) throw new CrmError('Altegio server/network error', { kind: ErrorKind.NETWORK, retryable: true, cause: base, vendorMessage });
      throw new CrmError(`Altegio request failed (${res.status})`, { kind: ErrorKind.VALIDATION, retryable: false, cause: base, vendorMessage });
    }
    return (json?.data ?? json) as T;
  }

  private stripHtml(html?: string | null): string | undefined {
    if (!html) return undefined;
    return String(html).replace(/<[^>]+>/g, '').trim() || undefined;
  }

  // Normalized pull
  async pullSalon(): Promise<SalonData> {
    return SalonBlock.pullSalon(this.ctx());
  }

  async pullAltegioBookings(bookingIds: string[]): Promise<Page<AltegioBooking>> {
    return BookingsBlock.pullBookings(this.ctx(), bookingIds);
  }

  async pullEasyWeekBookings(bookingIds: string[]): Promise<Page<EasyWeekBooking>> {
    throw new CrmError('Altegio does not support EasyWeekBookings', { kind: ErrorKind.NOT_SUPPORTED, retryable: false });
  }

  async pullCategories(): Promise<Page<CategoryData>> {
    return CategoriesBlock.pullCategories(this.ctx());
  }

  async pullServices(): Promise<Page<ServiceData>> {
    return ServicesBlock.pullServices(this.ctx());
  }

  async pullWorkers(): Promise<Page<WorkerData>> {
    return WorkersBlock.pullWorkers(this.ctx());
  }

  async createCategory(data: CategoryCreateInput): Promise<CategoryData> {
    return CategoriesBlock.createCategory(this.ctx(), data);
  }

  async updateCategory(externalId: string, patch: CategoryUpdateInput): Promise<CategoryData> {
    return CategoriesBlock.updateCategory(this.ctx(), externalId, patch);
  }

  async deleteCategory(externalId: string): Promise<void> {
    return CategoriesBlock.deleteCategory(this.ctx(), externalId);
  }

  async createService(data: ServiceCreateInput): Promise<ServiceData> {
    return ServicesBlock.createService(this.ctx(), data);
  }

  async updateService(externalId: string, patch: ServiceUpdateInput): Promise<ServiceData> {
    return ServicesBlock.updateService(this.ctx(), externalId, patch);
  }

  async deleteService(externalId: string): Promise<void> {
    return ServicesBlock.deleteService(this.ctx(), externalId);
  }

  async createWorker(data: WorkerCreateInput): Promise<WorkerData> {
    return WorkersBlock.createWorker(this.ctx(), data);
  }

  async updateWorker(externalId: string, patch: WorkerUpdateInput): Promise<WorkerData> {
    return WorkersBlock.updateWorker(this.ctx(), externalId, patch);
  }

  async deleteWorker(externalId: string): Promise<void> {
    return WorkersBlock.deleteWorker(this.ctx(), externalId);
  }

  // ---- Booking flow (Altegio-specific) ----
  async getBookServices(args?: { serviceIds?: number[]; staffId?: number }) {
    return BookingFlow.getBookServices(this.ctx(), args);
  }

  async getBookStaff(args?: { serviceIds?: number[]; datetime?: string }) {
    return BookingFlow.getBookStaff(this.ctx(), args);
  }

  async getBookDates(args?: { serviceIds?: number[]; staffId?: number; dateFrom?: string; dateTo?: string }) {
    return BookingFlow.getBookDates(this.ctx(), args);
  }

  async getBookTimes(args: { staffId: number; date: string; serviceIds?: number[] }) {
    return BookingFlow.getBookTimes(this.ctx(), args);
  }

  async createRecord(payload: BookingFlow.AltegioCreateRecordPayload) {
    return BookingFlow.createRecord(this.ctx(), payload);
  }

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
