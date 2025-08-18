import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingService } from '../../src/onboarding/onboarding.service';
import { PrismaService } from '../../src/shared/database/prisma.service';
import { EasyWeekDiscoveryClient } from '../../src/onboarding/clients/easyweek-discovery.client';
import { CrmIntegrationClient } from '../../src/onboarding/clients/crm-integration.client';
import { BadRequestException } from '@nestjs/common';

describe('OnboardingService EasyWeek', () => {
  let service: OnboardingService;
  const discovery = { listLocations: jest.fn() };
  const crm = { linkEasyWeek: jest.fn(), enqueueInitialSync: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: PrismaService, useValue: {} },
        { provide: EasyWeekDiscoveryClient, useValue: discovery },
        { provide: CrmIntegrationClient, useValue: crm },
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
    jest.spyOn(service as any, 'resolveCurrentSalonId').mockResolvedValue('internal-1');
    crm.linkEasyWeek.mockResolvedValue({ jobId: 'job-1' });
    const res = await service.finalizeEasyWeekLink('user-1', 'token', 'slug', 'external-1');
    expect(crm.linkEasyWeek).toHaveBeenCalledWith({
      salonId: 'internal-1',
      authToken: 'token',
      workspaceSlug: 'slug',
      externalSalonUuid: 'external-1',
    });
    expect(crm.enqueueInitialSync).toHaveBeenCalledWith('internal-1');
    expect(res).toEqual({ jobId: 'job-1' });
  });

  it('finalizeEasyWeekLink throws if resolveCurrentSalonId fails', async () => {
    jest.spyOn(service as any, 'resolveCurrentSalonId').mockRejectedValue(new BadRequestException());
    await expect(
      service.finalizeEasyWeekLink('user-1', 'token', 'slug', 'external-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(crm.linkEasyWeek).not.toHaveBeenCalled();
  });
});
