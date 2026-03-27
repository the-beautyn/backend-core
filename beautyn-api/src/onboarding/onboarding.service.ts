import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { randomInt, createHmac } from 'crypto';
import { PrismaService } from '../shared/database/prisma.service';
import { OnboardingProgressDto } from './dto/onboarding-progress.dto';
import { SalonMapper } from '../salon/mappers/salon.mapper';
import { SalonDto } from '../salon/dto/salon.dto';
import { OnboardingMapper } from './mappers/onboarding.mapper';
import { EasyWeekDiscoveryClient } from './clients/easyweek-discovery.client';
import { CrmIntegrationService } from '../crm-integration/core/crm-integration.service';
import { CrmSyncOrchestratorService } from '../crm-integration/sync/crm-sync-orchestrator.service';
import { CrmType } from '@crm/shared';
import { createChildLogger } from '@shared/logger';

@Injectable()
export class OnboardingService {
  private readonly log = createChildLogger('onboarding.service');

  constructor(
    private readonly prisma: PrismaService,
    private readonly crmIntegration: CrmIntegrationService,
    private readonly syncOrchestrator: CrmSyncOrchestratorService,
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

  async finalizeEasyWeekLink(userId: string, authToken: string, workspaceSlug: string, externalSalonUuids: string[]) {
    await this.crmIntegration.linkEasyWeek({ userId, authToken, workspaceSlug, externalSalonIds: externalSalonUuids });
    await this.markCrmLinkedByUser(userId);
    return { success: true };
  }

  async markCrmLinkedByUser(userId: string): Promise<void> {
    if (!userId) throw new BadRequestException('user required');
    await this.prisma.onboardingStep.upsert({
      where: { userId },
      create: { userId, crmConnected: true, currentStep: 'BRAND' },
      update: { crmConnected: true, currentStep: 'BRAND' },
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

  async startInitialSync(userId: string): Promise<{ jobIds: string[] }> {
    if (!userId) throw new BadRequestException('user required');
    const brandIds = await this.prisma.brandMember.findMany({
      where: { userId },
      select: { brandId: true },
    });
    if (!brandIds.length) throw new BadRequestException('Brand not found');
    const salons = await this.prisma.salon.findMany({
      where: { brandId: { in: brandIds.map((b) => b.brandId) }, deletedAt: null },
      select: { id: true, provider: true },
    });
    if (!salons.length) {
      throw new BadRequestException('Salon or provider not linked');
    }
    const jobIds: string[] = [];
    for (const salon of salons) {
      if (!salon?.id || !salon?.provider) continue;
      const { jobId } = await this.crmIntegration.enqueueInitialSync(salon.id, salon.provider as CrmType);
      jobIds.push(jobId);
    }
    return { jobIds };
  }

  // New sync variant: run initial pull synchronously (no queue)
  async startInitialPullNow(userId: string): Promise<{
    salons: {
      items: Array<{
        info: SalonDto;
        categories: { items: any[] };
        services: { items: any[] };
        workers: { items: any[] };
      }>;
    };
  }> {
    if (!userId) throw new BadRequestException('user required');
    const brandIds = await this.prisma.brandMember.findMany({
      where: { userId },
      select: { brandId: true },
    });
    if (!brandIds.length) throw new BadRequestException('Brand not found');
    const salons = await this.prisma.salon.findMany({
      where: { brandId: { in: brandIds.map((b) => b.brandId) }, deletedAt: null },
    });
    if (!salons.length) throw new BadRequestException('Salon or provider not linked');
    const items: Array<{
      info: SalonDto;
      categories: { items: any[] };
      services: { items: any[] };
      workers: { items: any[] };
    }> = [];
    for (const salon of salons) {
      const result = await this.syncOrchestrator.runInitialPullNow(salon.id);
      const refreshed = await this.prisma.salon.findUnique({ where: { id: salon.id } });
      const info = refreshed ? SalonMapper.toDto(refreshed as any) : SalonMapper.toDto(salon as any);
      items.push({
        info,
        categories: { items: result.categories.items ?? [] },
        services: { items: result.services.items ?? [] },
        workers: { items: result.workers.items ?? [] },
      });
    }
    return {
      salons: {
        items,
      },
    };
  }

}
