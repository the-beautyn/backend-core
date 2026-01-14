import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomInt, createHmac } from 'crypto';
import { PrismaService } from '../shared/database/prisma.service';
import { OnboardingProgressDto } from './dto/onboarding-progress.dto';
import { OnboardingMapper } from './mappers/onboarding.mapper';
import { EasyWeekDiscoveryClient } from './clients/easyweek-discovery.client';
import { CrmIntegrationService } from '../crm-integration/core/crm-integration.service';
import { CrmType } from '@crm/shared';
import { createChildLogger } from '@shared/logger';
import { SubmitSalonFromCrmDto } from './dto/submit-salon-from-crm.dto';

@Injectable()
export class OnboardingService {
  private readonly log = createChildLogger('onboarding.service');

  constructor(
    private readonly prisma: PrismaService,
    private readonly crmIntegration: CrmIntegrationService,
    @Optional() private readonly ew?: EasyWeekDiscoveryClient
  ) {}

  async getOrCreateProgress(userId: string): Promise<OnboardingProgressDto> {
    let step = await this.prisma.onboardingStep.findUnique({ where: { userId } });
    if (!step) {
      step = await this.prisma.onboardingStep.create({ data: { userId } });
    }
    return OnboardingMapper.toProgressDto(step);
  }

  async discoverEasyWeekSalons(userId: string, authToken: string, workspaceSlug: string) {
    if (!this.ew) throw new BadRequestException('EasyWeek client unavailable');
    const salons = await this.ew.listLocations(authToken, workspaceSlug);
    return { salons };
  }

  async finalizeEasyWeekLink(userId: string, authToken: string, workspaceSlug: string, externalSalonUuid: string) {
    await this.crmIntegration.linkEasyWeek({ userId, authToken, workspaceSlug, externalSalonId: externalSalonUuid });
    await this.markCrmLinkedByUser(userId);
    return { success: true };
  }

  async markCrmLinkedByUser(userId: string): Promise<void> {
    if (!userId) throw new BadRequestException('user required');
    await this.prisma.onboardingStep.upsert({
      where: { userId },
      create: { userId, crmConnected: true, currentStep: 'SALON_PROFILE' },
      update: { crmConnected: true, currentStep: 'SALON_PROFILE' },
    });
  }

  async generateAltegioPairCode(userId: string) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const pepper = process.env.PAIRING_CODE_PEPPER || '';
    const codeHash = createHmac('sha256', pepper).update(code).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.prisma.crmPairingCode.create({
      data: {
        provider: 'ALTEGIO',
        userId,
        codeHash,
        expiresAt,
      },
    });
    return { code, expiresAt };
  }

  // Variant that derives salonId and provider from the current user
  async getCrmSalonPreviewForUser(userId: string) {
    if (!userId) throw new BadRequestException('user required');
    const step = await this.prisma.onboardingStep.findUnique({ where: { userId } });
    if (!step?.crmConnected) {
      throw new BadRequestException('CRM is not connected');
    }
    const salon = await this.prisma.salon.findFirst({ where: { ownerUserId: userId } });
    if (!salon?.id || !salon?.provider) {
      throw new BadRequestException('Salon or provider not linked');
    }
    const provider = salon.provider as CrmType;
    const allowed = new Set(Object.values(CrmType));
    if (!allowed.has(provider)) {
      throw new BadRequestException('Unsupported provider');
    }
    const data = await this.crmIntegration.pullSalonAndDetectChanges(salon.id);
    return { salon: data };
  }

  async startInitialSync(userId: string): Promise<{ jobId: string }> {
    if (!userId) throw new BadRequestException('user required');
    const salon = await this.prisma.salon.findFirst({ where: { ownerUserId: userId } });
    if (!salon?.id || !salon?.provider) {
      throw new BadRequestException('Salon or provider not linked');
    }
    return this.crmIntegration.enqueueInitialSync(salon.id, salon.provider as CrmType);
  }

  // New sync variant: run initial pull synchronously (no queue)
  async startInitialPullNow(userId: string): Promise<{
    categories: { items: any[]; upserted: number; deleted: number };
    services: { items: any[]; upserted: number; deleted: number };
    workers: { items: any[]; upserted: number; deleted: number };
  }> {
    if (!userId) throw new BadRequestException('user required');
    const salon = await this.prisma.salon.findFirst({ where: { ownerUserId: userId } });
    if (!salon?.id) throw new BadRequestException('Salon or provider not linked');
    return this.crmIntegration.runInitialPullNow(salon.id);
  }

  /**
   * Applies the latest CRM salon preview to the local Salon record and advances onboarding.
   */
  async submitSalonFromCrm(userId: string, dto?: SubmitSalonFromCrmDto): Promise<{ salonId: string }> {
    this.log.info('Submitting salon from CRM', { userId });
    if (!userId) throw new BadRequestException('user required');
    const salon = await this.prisma.salon.findFirst({ where: { ownerUserId: userId } });
    if (!salon?.id || !salon?.provider) {
      throw new BadRequestException('Salon or provider not linked');
    }

    // Resolve snapshot: prefer latest stored snapshot; if absent, pull live and detect changes
    const latestSnapshot = await this.prisma.crmSalonSnapshot.findFirst({
      where: { salonId: salon.id },
      orderBy: { fetchedAt: 'desc' },
      select: { payloadJson: true },
    });

    this.log.debug('Latest snapshot resolved', { hasSnapshot: Boolean(latestSnapshot) });

    const remote = latestSnapshot?.payloadJson ?? (await this.crmIntegration.pullSalonAndDetectChanges(salon.id));

    // Define allowed/known field paths
    const allowedPaths = new Set<string>([
      'name',
      'description',
      'mainImageUrl',
      'imageUrls',
      'phone',
      'email',
      'location.country',
      'location.city',
      'location.addressLine',
      'location.lat',
      'location.lon',
      'workingSchedule',
      'timezone',
    ]);

    const toDecimal = (value: unknown): Prisma.Decimal | null => {
      if (value === null || value === undefined) return null;
      const num = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(num) ? new Prisma.Decimal(num) : null;
    };

    const normalizeCountry = (value: unknown): string | null => {
      if (value == null) return null;
      const s = String(value).trim();
      return s.length ? s.slice(0, 64) : null;
    };

    const getByPath = (obj: any, path: string) => path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);

    const shouldApply = (path: string): boolean => {
      if (!dto || dto.accept_all) return true;
      if (Array.isArray(dto.accepted_fields) && dto.accepted_fields.length) {
        return dto.accepted_fields.includes(path);
      }
      return false;
    };

    // Apply snapshot (all or selected) and overrides in a single transaction
    await this.prisma.$transaction(async (tx) => {
      const baseUpdate: any = {};
      // Apply from snapshot based on mode
      for (const path of allowedPaths) {
        this.log.info(`Applying path: ${path}`);
        if (!shouldApply(path)) continue;
        const value = getByPath(remote as any, path);
        if (value === undefined) continue;

        switch (path) {
          case 'name':
            baseUpdate.name = value ?? null;
            break;
          case 'description':
            baseUpdate.description = value ?? null;
            break;
          case 'mainImageUrl':
            baseUpdate.coverImageUrl = value ?? null;
            break;
          case 'phone':
            baseUpdate.phone = value ?? null;
            break;
          case 'email':
            baseUpdate.email = value ?? null;
            break;
          case 'workingSchedule':
            baseUpdate.workingSchedule = value ?? null;
            break;
          case 'timezone':
            baseUpdate.timezone = value ?? null;
            break;
          case 'location.country':
            baseUpdate.country = normalizeCountry(value);
            break;
          case 'location.city':
            baseUpdate.city = value ?? null;
            break;
          case 'location.addressLine':
            baseUpdate.addressLine = value ?? null;
            break;
          case 'location.lat':
            baseUpdate.latitude = toDecimal(value);
            break;
          case 'location.lon':
            baseUpdate.longitude = toDecimal(value);
            break;
        }
      }

      if (Object.keys(baseUpdate).length) {
        await tx.salon.update({ where: { id: salon.id }, data: baseUpdate });
      }

      // Images from snapshot
      if (shouldApply('imageUrls')) {
        const urls: string[] = Array.isArray((remote as any)?.imageUrls)
          ? ((remote as any).imageUrls.filter((u: unknown): u is string => typeof u === 'string' && u.length > 0) as string[])
          : [];
        await tx.salonImage.deleteMany({ where: { salonId: salon.id } });
        if (urls.length) {
          await tx.salonImage.createMany({
            data: urls.map((imageUrl, index) => ({ salonId: salon.id, imageUrl, sortOrder: index })),
          });
        }
        await tx.salon.update({ where: { id: salon.id }, data: { imagesCount: urls.length } });
      }

      // Apply overrides last (if provided)
      if (dto?.overrides) {
        const o = dto.overrides as any;
        const overrideUpdate: any = {};
        if ('name' in o) overrideUpdate.name = o.name ?? null;
        if ('description' in o) overrideUpdate.description = o.description ?? null;
        if ('mainImageUrl' in o) overrideUpdate.coverImageUrl = o.mainImageUrl ?? null;
        if ('phone' in o) overrideUpdate.phone = o.phone ?? null;
        if ('email' in o) overrideUpdate.email = o.email ?? null;
        if ('workingSchedule' in o) overrideUpdate.workingSchedule = o.workingSchedule ?? null;
        if ('timezone' in o) overrideUpdate.timezone = o.timezone ?? null;
        if (o.location) {
          if ('country' in o.location) overrideUpdate.country = o.location.country ?? null;
          if ('city' in o.location) overrideUpdate.city = o.location.city ?? null;
          if ('addressLine' in o.location) overrideUpdate.addressLine = o.location.addressLine ?? null;
          if ('lat' in o.location) overrideUpdate.latitude = toDecimal(o.location.lat);
          if ('lon' in o.location) overrideUpdate.longitude = toDecimal(o.location.lon);
        }

        if ('country' in overrideUpdate) {
          overrideUpdate.country = normalizeCountry(overrideUpdate.country);
        }

        if (Object.keys(overrideUpdate).length) {
          await tx.salon.update({ where: { id: salon.id }, data: overrideUpdate });
        }

        if (Array.isArray(o.imageUrls)) {
          const urls: string[] = (o.imageUrls.filter((u: unknown): u is string => typeof u === 'string' && u.length > 0) as string[]);
          await tx.salonImage.deleteMany({ where: { salonId: salon.id } });
          if (urls.length) {
            await tx.salonImage.createMany({
              data: urls.map((imageUrl, index) => ({ salonId: salon.id, imageUrl, sortOrder: index })),
            });
          }
          await tx.salon.update({ where: { id: salon.id }, data: { imagesCount: urls.length } });
        }
      }

      // Advance onboarding progress
      await tx.onboardingStep.upsert({
        where: { userId },
        create: { userId, crmConnected: true, salonCreated: true, currentStep: 'SUBSCRIPTION' },
        update: { crmConnected: true, salonCreated: true, currentStep: 'SUBSCRIPTION' },
      });
    });

    return { salonId: salon.id };
  }
}
