import { Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/database/prisma.service';
import { OnboardingProgressDto } from './dto/onboarding-progress.dto';
import { OnboardingMapper } from './mappers/onboarding.mapper';

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateProgress(userId: string): Promise<OnboardingProgressDto> {
    let step = await this.prisma.onboardingStep.findUnique({ where: { userId } });
    if (!step) {
      step = await this.prisma.onboardingStep.create({ data: { userId } });
    }
    return OnboardingMapper.toProgressDto(step);
  }
}
