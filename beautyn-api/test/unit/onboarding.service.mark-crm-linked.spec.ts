import { OnboardingService } from '../../src/onboarding/onboarding.service';

// markCrmLinkedByUser used to upsert currentStep = BRAND unconditionally, so a CRM
// link after onboarding was complete (re-pair, second CRM — BEA-75) sent the owner
// back to the Brand step, which then rejected them: they already had a brand.
describe('OnboardingService.markCrmLinkedByUser', () => {
  const userId = 'user-1';
  let prisma: { onboardingStep: { updateMany: jest.Mock; upsert: jest.Mock } };
  let service: OnboardingService;

  beforeEach(() => {
    prisma = {
      onboardingStep: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        upsert: jest.fn().mockResolvedValue(undefined),
      },
    };
    service = new OnboardingService(prisma as any, {} as any, {} as any, {} as any);
  });

  it('advances a user at the CRM step to BRAND', async () => {
    prisma.onboardingStep.updateMany.mockResolvedValue({ count: 1 });

    await service.markCrmLinkedByUser(userId);

    expect(prisma.onboardingStep.updateMany).toHaveBeenCalledWith({
      where: { userId, currentStep: 'CRM' },
      data: { crmConnected: true, currentStep: 'BRAND' },
    });
    expect(prisma.onboardingStep.upsert).not.toHaveBeenCalled();
  });

  it('starts a user with no progress row at BRAND', async () => {
    await service.markCrmLinkedByUser(userId);

    expect(prisma.onboardingStep.upsert).toHaveBeenCalledWith({
      where: { userId },
      create: { userId, crmConnected: true, currentStep: 'BRAND' },
      update: { crmConnected: true },
    });
  });

  it('only flags the CRM as connected for a user already past the CRM step', async () => {
    // updateMany matched nothing: the row exists at BRAND / SUBSCRIPTION / COMPLETED.
    await service.markCrmLinkedByUser(userId);

    const { update } = prisma.onboardingStep.upsert.mock.calls[0][0];
    expect(update).toEqual({ crmConnected: true });
  });

  it('rejects an empty user id', async () => {
    await expect(service.markCrmLinkedByUser('')).rejects.toThrow('user required');
    expect(prisma.onboardingStep.updateMany).not.toHaveBeenCalled();
  });
});
