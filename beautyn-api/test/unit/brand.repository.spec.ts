import { BrandRepository } from '../../src/brand/brand.repository';

describe('BrandRepository', () => {
  const tx = {
    $executeRaw: jest.fn(),
    brand: { create: jest.fn() },
    salon: { findFirst: jest.fn(), updateMany: jest.fn() },
    brandMember: { create: jest.fn(), findFirst: jest.fn() },
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
    tx.brandMember.findFirst.mockResolvedValue(null);
    tx.onboardingStep.updateMany.mockResolvedValue({ count: 1 });
  });

  // BEA-75: the service checks "one brand per user" before the transaction, so two
  // concurrent creates both pass it; only a re-check under the lock stops the second.
  it('refuses a second brand for a user who already owns one, before creating anything', async () => {
    tx.brandMember.findFirst.mockResolvedValue({ id: 'member-1' });
    const repo = new BrandRepository(prisma, config);

    await expect(repo.createBrandWithOwner('user-1', 'Acme')).rejects.toThrow('User already has a brand');

    expect(tx.brandMember.findFirst).toHaveBeenCalledWith({ where: { userId: 'user-1', role: 'owner' }, select: { id: true } });
    expect(tx.brand.create).not.toHaveBeenCalled();
    const [lockOrder] = tx.$executeRaw.mock.invocationCallOrder;
    const [checkOrder] = tx.brandMember.findFirst.mock.invocationCallOrder;
    expect(lockOrder).toBeLessThan(checkOrder);
  });

  // BEA-75: brand creation and a late CRM link both write salon.brand_id; the
  // owner lock keeps them from interleaving into an orphaned salon.
  it('takes the owner lock before anything else in the transaction', async () => {
    tx.$executeRaw.mockResolvedValue(0);
    const repo = new BrandRepository(prisma, config);

    await repo.createBrandWithOwner('user-1', 'Acme');

    const [lockOrder] = tx.$executeRaw.mock.invocationCallOrder;
    const [createOrder] = tx.brand.create.mock.invocationCallOrder;
    expect(lockOrder).toBeLessThan(createOrder);
    expect(tx.$executeRaw.mock.calls[0][1]).toBe('owner_brand:user-1');
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
