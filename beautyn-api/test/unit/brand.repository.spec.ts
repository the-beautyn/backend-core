import { BrandRepository } from '../../src/brand/brand.repository';

describe('BrandRepository', () => {
  const tx = {
    brand: { create: jest.fn() },
    salon: { findFirst: jest.fn(), updateMany: jest.fn() },
    brandMember: { create: jest.fn() },
    onboardingStep: { updateMany: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn((cb: any) => cb(tx)),
  } as any;
  const config = {
    get: jest.fn((_key: string, defaultValue?: string) => defaultValue),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockImplementation((_key: string, defaultValue?: string) => defaultValue);
    tx.brand.create.mockResolvedValue({ id: 'brand-1', name: 'Acme' });
    tx.salon.findFirst.mockResolvedValue(null);
    tx.salon.updateMany.mockResolvedValue({ count: 0 });
    tx.brandMember.create.mockResolvedValue({});
    tx.onboardingStep.updateMany.mockResolvedValue({ count: 1 });
  });

  it('completes onboarding on brand creation when the subscription step is disabled (default)', async () => {
    const repo = new BrandRepository(prisma, config);

    await repo.createBrandWithOwner('user-1', 'Acme');

    expect(tx.onboardingStep.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', currentStep: 'BRAND' },
      data: { brandCreated: true, currentStep: 'COMPLETED', completed: true },
    });
  });

  it('advances to SUBSCRIPTION when the subscription step is enabled', async () => {
    config.get.mockImplementation((key: string, defaultValue?: string) =>
      key === 'ONBOARDING_SUBSCRIPTION_ENABLED' ? 'true' : defaultValue
    );
    const repo = new BrandRepository(prisma, config);

    await repo.createBrandWithOwner('user-1', 'Acme');

    expect(tx.onboardingStep.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', currentStep: 'BRAND' },
      data: { brandCreated: true, currentStep: 'SUBSCRIPTION' },
    });
  });
});
