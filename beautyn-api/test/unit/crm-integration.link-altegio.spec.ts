import { CrmIntegrationService } from '../../src/crm-integration/core/crm-integration.service';
import { CrmType } from '@crm/shared';

// linkAltegio either creates a salon row, adopts an ownerless one, or re-links one the
// same owner already has. None of the three ever set brand_id: only brand creation
// did, so a salon paired after the brand existed (a late Altegio callback, a re-pair)
// was invisible to the owner panel. Every outcome now joins the owner's brand.
describe('CrmIntegrationService.linkAltegio', () => {
  const userId = 'user-1';
  const ext = '1312212';
  let prisma: {
    $transaction: jest.Mock;
    $executeRaw: jest.Mock;
    salon: { findFirst: jest.Mock; update: jest.Mock; create: jest.Mock; updateMany: jest.Mock };
    brandMember: { findMany: jest.Mock; updateMany: jest.Mock };
  };
  let accounts: { setAltegio: jest.Mock };
  let tokens: { store: jest.Mock };
  let service: CrmIntegrationService;

  const attachedToBrand = (salonId: string) => ({
    where: { id: salonId, ownerUserId: userId, brandId: null },
    data: { brandId: 'brand-1' },
  });

  beforeEach(() => {
    delete process.env.ALTEGIO_BEARER;
    delete process.env.ALTEGIO_USER;
    prisma = {
      $transaction: jest.fn((cb: any) => cb(prisma)),
      $executeRaw: jest.fn().mockResolvedValue(0),
      salon: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({ id: 'salon-new' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      brandMember: {
        findMany: jest.fn().mockResolvedValue([{ brandId: 'brand-1' }]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    accounts = { setAltegio: jest.fn().mockResolvedValue(undefined) };
    tokens = { store: jest.fn().mockResolvedValue(undefined) };
    service = new CrmIntegrationService(prisma as any, accounts as any, tokens as any, {} as any, {} as any);
  });

  const link = () => service.linkAltegio({ userId, externalSalonIds: [ext] });

  it('creates the salon, registers the account and puts the salon into the brand', async () => {
    await expect(link()).resolves.toEqual({ salonIds: ['salon-new'] });

    expect(prisma.salon.create).toHaveBeenCalledWith({
      data: { ownerUserId: userId, externalSalonId: ext, provider: CrmType.ALTEGIO },
      select: { id: true },
    });
    expect(prisma.salon.updateMany).toHaveBeenCalledWith(attachedToBrand('salon-new'));
    expect(prisma.brandMember.updateMany).toHaveBeenCalledWith({
      where: { brandId: 'brand-1', userId, lastSelectedSalonId: null },
      data: { lastSelectedSalonId: 'salon-new' },
    });
    expect(accounts.setAltegio).toHaveBeenCalledWith('salon-new', { externalSalonId: Number(ext) });
  });

  it('registers the account before attaching, so a retry after a crash finds a whole salon', async () => {
    await link();
    const [registerOrder] = accounts.setAltegio.mock.invocationCallOrder;
    const [attachOrder] = prisma.salon.updateMany.mock.invocationCallOrder;
    expect(registerOrder).toBeLessThan(attachOrder);
  });

  it('adopts an ownerless salon, repairs its account entry and puts it into the brand', async () => {
    prisma.salon.findFirst.mockResolvedValue({ id: 'salon-old', ownerUserId: null });

    await expect(link()).resolves.toEqual({ salonIds: ['salon-old'] });
    expect(prisma.salon.update).toHaveBeenCalledWith({ where: { id: 'salon-old' }, data: { ownerUserId: userId } });
    expect(accounts.setAltegio).toHaveBeenCalledWith('salon-old', { externalSalonId: Number(ext) });
    expect(prisma.salon.updateMany).toHaveBeenCalledWith(attachedToBrand('salon-old'));
    expect(prisma.salon.create).not.toHaveBeenCalled();
  });

  it('puts a re-paired salon of the same owner into the brand and re-registers its account', async () => {
    prisma.salon.findFirst.mockResolvedValue({ id: 'salon-old', ownerUserId: userId });

    await expect(link()).resolves.toEqual({ salonIds: ['salon-old'] });
    expect(prisma.salon.update).not.toHaveBeenCalled();
    // A first attempt that died right after salon.create left no account entry;
    // the retry must not leave the salon unsyncable.
    expect(accounts.setAltegio).toHaveBeenCalledWith('salon-old', { externalSalonId: Number(ext) });
    expect(prisma.salon.updateMany).toHaveBeenCalledWith(attachedToBrand('salon-old'));
  });

  it('stores the env tokens on a re-pair when they are configured', async () => {
    process.env.ALTEGIO_BEARER = 'bearer';
    process.env.ALTEGIO_USER = 'user-token';
    prisma.salon.findFirst.mockResolvedValue({ id: 'salon-old', ownerUserId: userId });

    await link();
    expect(tokens.store).toHaveBeenCalledWith('salon-old', CrmType.ALTEGIO, { accessToken: 'bearer', userToken: 'user-token' });
  });

  it('leaves brand_id alone while the owner has no brand yet', async () => {
    prisma.brandMember.findMany.mockResolvedValue([]);

    await expect(link()).resolves.toEqual({ salonIds: ['salon-new'] });
    expect(prisma.salon.updateMany).not.toHaveBeenCalled();
    expect(prisma.brandMember.updateMany).not.toHaveBeenCalled();
  });

  it('leaves brand_id alone when the owner belongs to several brands', async () => {
    prisma.brandMember.findMany.mockResolvedValue([{ brandId: 'brand-1' }, { brandId: 'brand-2' }]);

    await expect(link()).resolves.toEqual({ salonIds: ['salon-new'] });
    expect(prisma.salon.updateMany).not.toHaveBeenCalled();
  });

  it('refuses a salon owned by someone else and touches nothing', async () => {
    prisma.salon.findFirst.mockResolvedValue({ id: 'salon-old', ownerUserId: 'someone-else' });

    await expect(link()).rejects.toThrow(/already linked to another user/);
    expect(prisma.salon.update).not.toHaveBeenCalled();
    expect(prisma.salon.updateMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(accounts.setAltegio).not.toHaveBeenCalled();
  });
});
