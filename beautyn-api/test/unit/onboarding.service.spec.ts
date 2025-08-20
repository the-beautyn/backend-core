import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingService } from '../../src/onboarding/onboarding.service';
import { PrismaService } from '../../src/shared/database/prisma.service';

describe('OnboardingService', () => {
  let service: OnboardingService;
  const prisma = {
    onboardingStep: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(OnboardingService);
  });

  it('creates default record when none exists and returns DTO', async () => {
    prisma.onboardingStep.findUnique.mockResolvedValue(null);
    const created = {
      id: 'uuid',
      userId: 'user-1',
      crmConnected: false,
      subscriptionSet: false,
      currentStep: 'CRM',
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prisma.onboardingStep.create.mockResolvedValue(created);

    const result = await service.getOrCreateProgress('user-1');

    expect(prisma.onboardingStep.create).toHaveBeenCalledWith({ data: { userId: 'user-1' } });
    expect(result).toEqual({
      crm_connected: false,
      subscription_set: false,
      completed: false,
      current_step: 'CRM',
    });
  });
});
