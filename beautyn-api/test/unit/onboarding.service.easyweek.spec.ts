import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingService } from '../../src/onboarding/onboarding.service';
import { PrismaService } from '../../src/shared/database/prisma.service';
import { EasyWeekDiscoveryClient } from '../../src/onboarding/clients/easyweek-discovery.client';
import { CrmIntegrationService } from '../../src/crm-integration/core/crm-integration.service';
import { CrmSyncOrchestratorService } from '../../src/crm-integration/sync/crm-sync-orchestrator.service';
import { BadRequestException } from '@nestjs/common';
import { SyncSchedulerService } from '@crm/sync-scheduler';

describe('OnboardingService EasyWeek', () => {
  let service: OnboardingService;
  const discovery = { listLocations: jest.fn() };
  const crm = { linkEasyWeek: jest.fn(), enqueueInitialSync: jest.fn() } as any;
  const prisma = { onboardingStep: { upsert: jest.fn().mockResolvedValue(undefined) } } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: PrismaService, useValue: prisma },
        { provide: EasyWeekDiscoveryClient, useValue: discovery },
        { provide: CrmIntegrationService, useValue: crm },
        { provide: CrmSyncOrchestratorService, useValue: {} },
        { provide: SyncSchedulerService, useValue: {} },
      ],
    }).compile();

    service = module.get(OnboardingService);
    jest.clearAllMocks();
  });

  it('discoverEasyWeekSalons returns mapped salons', async () => {
    discovery.listLocations.mockResolvedValue([{ uuid: 'a', name: 'Salon A' }]);
    const res = await service.discoverEasyWeekSalons('user-1', 'token', 'slug');
    expect(res).toEqual({ salons: [{ uuid: 'a', name: 'Salon A' }] });
    expect(discovery.listLocations).toHaveBeenCalledWith('token', 'slug');
  });

  it('finalizeEasyWeekLink links and enqueues', async () => {
    crm.linkEasyWeek.mockResolvedValue(undefined);
    await service.finalizeEasyWeekLink('user-1', 'token', 'slug', ['external-1']);
    expect(crm.linkEasyWeek).toHaveBeenCalledWith({
      userId: 'user-1',
      authToken: 'token',
      workspaceSlug: 'slug',
      externalSalonIds: ['external-1'],
    });
  });

  it('finalizeEasyWeekLink propagates CRM error', async () => {
    crm.linkEasyWeek.mockRejectedValue(new BadRequestException());
    await expect(service.finalizeEasyWeekLink('user-1', 'token', 'slug', ['external-1']))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
