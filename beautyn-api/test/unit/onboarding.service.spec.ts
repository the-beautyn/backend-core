import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OnboardingService } from '../../src/onboarding/onboarding.service';
import { PrismaService } from '../../src/shared/database/prisma.service';
import { CrmIntegrationService } from '../../src/crm-integration/core/crm-integration.service';
import { CrmSyncOrchestratorService } from '../../src/crm-integration/sync/crm-sync-orchestrator.service';
import { SyncSchedulerService } from '@crm/sync-scheduler';

describe('OnboardingService', () => {
  let service: OnboardingService;
  const prisma = {
    onboardingStep: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  } as any;
  const config = {
    get: jest.fn((_key: string, defaultValue?: string) => defaultValue),
  };

  beforeEach(async () => {
    config.get.mockImplementation((_key: string, defaultValue?: string) => defaultValue);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: PrismaService, useValue: prisma },
        { provide: CrmIntegrationService, useValue: {} },
        { provide: CrmSyncOrchestratorService, useValue: {} },
        { provide: SyncSchedulerService, useValue: {} },
        { provide: ConfigService, useValue: config },
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

  it('reports legacy SUBSCRIPTION rows as COMPLETED while the subscription step is disabled', async () => {
    prisma.onboardingStep.findUnique.mockResolvedValue({
      id: 'uuid',
      userId: 'user-1',
      crmConnected: true,
      brandCreated: true,
      subscriptionSet: false,
      currentStep: 'SUBSCRIPTION',
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.getOrCreateProgress('user-1');

    expect(result).toEqual({
      crm_connected: true,
      brand_created: true,
      subscription_set: false,
      completed: true,
      current_step: 'COMPLETED',
    });
  });

  it('passes SUBSCRIPTION through unchanged when the subscription step is enabled', async () => {
    config.get.mockImplementation((key: string, defaultValue?: string) =>
      key === 'ONBOARDING_SUBSCRIPTION_ENABLED' ? 'true' : defaultValue
    );
    prisma.onboardingStep.findUnique.mockResolvedValue({
      id: 'uuid',
      userId: 'user-1',
      crmConnected: true,
      brandCreated: true,
      subscriptionSet: false,
      currentStep: 'SUBSCRIPTION',
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.getOrCreateProgress('user-1');

    expect(result).toEqual({
      crm_connected: true,
      brand_created: true,
      subscription_set: false,
      completed: false,
      current_step: 'SUBSCRIPTION',
    });
  });
});
