import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { randomInt, createHmac } from 'crypto';
import { PrismaService } from '../shared/database/prisma.service';
import { OnboardingProgressDto } from './dto/onboarding-progress.dto';
import { OnboardingMapper } from './mappers/onboarding.mapper';
import { EasyWeekDiscoveryClient } from './clients/easyweek-discovery.client';
import { CrmIntegrationService } from '../crm-integration/core/crm-integration.service';

@Injectable()
export class OnboardingService {
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
  }

  async markCrmLinkedByUser(userId: string): Promise<void> {
    if (!userId) throw new BadRequestException('user required');
    await this.prisma.onboardingStep.upsert({
      where: { userId },
      create: { userId, crmConnected: true, currentStep: 'SUBSCRIPTION' },
      update: { crmConnected: true, currentStep: 'SUBSCRIPTION' },
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
}
