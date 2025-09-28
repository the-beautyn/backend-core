import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CrmType } from '@crm/shared';
import { AccountRegistryService } from '@crm/account-registry';
import { TokenStorageService } from '@crm/token-storage';
import { CrmAdapterService } from '@crm/adapter';
import { CrmSalonDiffService } from '../../crm-salon-changes/crm-salon-diff.service';
import { CategoryData, CategoryCreateInput, CategoryUpdateInput, Page, SalonData } from '@crm/provider-core';
import { SyncSchedulerService } from '@crm/sync-scheduler';

@Injectable()
export class CrmIntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountRegistryService,
    private readonly tokens: TokenStorageService,
    private readonly adapter: CrmAdapterService,
    private readonly salonDiff: CrmSalonDiffService,
    private readonly scheduler: SyncSchedulerService,
  ) {}

  private logger = new Logger(CrmIntegrationService.name);

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

  async enqueueCategoriesSync(salonId: string, provider: CrmType): Promise<{ jobId: string }> {
    const jobId = await this.scheduler.scheduleSync({ salonId, provider });
    return { jobId };
  }

  async enqueueInitialSync(salonId: string, provider: CrmType): Promise<{ jobId: string }> {
    return this.enqueueCategoriesSync(salonId, provider);
  }

  async pullCategories(salonId: string, provider: CrmType, cursor?: string): Promise<Page<CategoryData>> {
    return this.adapter.pullCategories(salonId, provider, cursor);
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

  /**
   * Synchronous initial pull runner: pulls salon preview and categories, then upserts categories via internal API.
   * Returns a concise summary of what was done.
   */
  async syncCategoriesNow(salonId: string, provider?: CrmType): Promise<{ categories: any[]; upserted: number; deleted: number }> {
    const resolvedProvider = provider ?? (await this.resolveSalonProvider(salonId));
    const page = await this.adapter.pullCategories(salonId, resolvedProvider);
    const payload = this.prepareCategoriesSyncPayload(page?.items ?? []);
    return this.pushCategoriesToInternal(salonId, payload);
  }

  async runInitialPullNow(salonId: string): Promise<{ categories: any[]; upserted: number; deleted: number }> {
    return this.syncCategoriesNow(salonId);
  }

  async rebaseCategoriesNow(salonId: string, provider: CrmType): Promise<{ categories: any[]; upserted: number; deleted: number }> {
    return this.syncCategoriesNow(salonId, provider);
  }

  private async resolveSalonProvider(salonId: string): Promise<CrmType> {
    const salon = await this.prisma.salon.findUnique({ where: { id: salonId }, select: { provider: true } });
    if (!salon?.provider) {
      throw new BadRequestException('Salon is not linked to a CRM provider');
    }
    return salon.provider as CrmType;
  }

  private prepareCategoriesSyncPayload(categories: CategoryData[]): Array<{ crm_external_id?: string; name: string; color?: string | null; sort_order?: number | null }> {
    return categories.map((category) => ({
      crm_external_id: category.externalId ? String(category.externalId) : undefined,
      name: String(category.name ?? ''),
      color: category.color ?? undefined,
      sort_order: category.sortOrder ?? undefined,
    }));
  }

  private async pushCategoriesToInternal(
    salonId: string,
    categories: Array<{ crm_external_id?: string; name: string; color?: string | null; sort_order?: number | null }>,
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

    return payload;
  }
}
