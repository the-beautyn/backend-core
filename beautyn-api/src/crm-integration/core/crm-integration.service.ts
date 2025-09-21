import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CrmType } from '@crm/shared';
import { AccountRegistryService } from '@crm/account-registry';
import { TokenStorageService } from '@crm/token-storage';
import { CrmAdapterService } from '@crm/adapter';
import { CrmSalonDiffService } from '../../crm-salon-changes/crm-salon-diff.service';
import { SalonData } from '@crm/provider-core';

@Injectable()
export class CrmIntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountRegistryService,
    private readonly tokens: TokenStorageService,
    private readonly adapter: CrmAdapterService,
    private readonly salonDiff: CrmSalonDiffService,
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

  async enqueueInitialSync(salonId: string): Promise<void> {
    return;
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
