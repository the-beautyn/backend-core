import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../shared/database/prisma.service';
import { OnboardingProgressDto } from './dto/onboarding-progress.dto';
import { OnboardingMapper } from './mappers/onboarding.mapper';
import { EasyWeekDiscoveryClient } from './clients/easyweek-discovery.client';
import { CrmIntegrationClient } from './clients/crm-integration.client';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly ew?: EasyWeekDiscoveryClient,
    @Optional() private readonly crm?: CrmIntegrationClient,
  ) {}

  async getOrCreateProgress(userId: string): Promise<OnboardingProgressDto> {
    let step = await this.prisma.onboardingStep.findUnique({ where: { userId } });
    if (!step) {
      step = await this.prisma.onboardingStep.create({ data: { userId } });
    }
    return OnboardingMapper.toProgressDto(step);
  }

  async discoverEasyWeekSalons(userId: string, authToken: string, workspaceSlug: string) {
    await this.ensureOwnerHasAnySalon(userId);
    if (!this.ew) throw new BadRequestException('EasyWeek client unavailable');
    const salons = await this.ew.listLocations(authToken, workspaceSlug);
    return { salons };
  }

  async finalizeEasyWeekLink(userId: string, authToken: string, workspaceSlug: string, externalSalonUuid: string) {
    if (!this.crm) throw new BadRequestException('CRM client unavailable');
    const salonId = await this.resolveCurrentSalonId(userId);
    const { jobId } = await this.crm.linkEasyWeek({ salonId, authToken, workspaceSlug, externalSalonUuid });
    await this.crm.enqueueInitialSync(salonId);
    return { jobId };
  }

  private async resolveCurrentSalonId(userId: string): Promise<string> {
    if (!userId) throw new BadRequestException('user required');
    return 'REPLACE_ME_WITH_LOOKUP';
  }

  private async ensureOwnerHasAnySalon(userId: string): Promise<void> {
    if (!userId) throw new BadRequestException('user required');
    return;
  }
}
