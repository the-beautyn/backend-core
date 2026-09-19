import { CrmIntegrationService } from '../src/crm-integration/core/crm-integration.service';
import { CrmType } from '@crm/shared';

// linkEasyWeek either creates a salon row or adopts an ownerless one for the same
// location. Adoption used to skip the credential and account writes, so a salon
// linked a second time kept the first key — and, once that key was revoked, every
// sync failed with "EasyWeek unauthorized".
describe('CrmIntegrationService.linkEasyWeek', () => {
  const userId = 'user-1';
  const uuid = '25fd5793-3025-40db-85e9-bcb7ebbf11d7';
  let prisma: {
    salon: { findFirst: jest.Mock; update: jest.Mock; create: jest.Mock };
  };
  let accounts: { setEasyWeek: jest.Mock };
  let tokens: { store: jest.Mock };
  let service: CrmIntegrationService;

  beforeEach(() => {
    prisma = {
      salon: {
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({ id: 'salon-new' }),
      },
    };
    accounts = { setEasyWeek: jest.fn().mockResolvedValue(undefined) };
    tokens = { store: jest.fn().mockResolvedValue(undefined) };
    service = new CrmIntegrationService(
      prisma as any,
      accounts as any,
      tokens as any,
      {} as any,
      {} as any,
    );
  });

  const link = (authToken = 'fresh-key', workspaceSlug = 'the-best-company') =>
    service.linkEasyWeek({
      userId,
      authToken,
      workspaceSlug,
      salons: [{ uuid }],
    });

  it('stores the key and workspace for a freshly created salon', async () => {
    prisma.salon.findFirst.mockResolvedValue(null);

    await expect(link()).resolves.toEqual({ salonIds: ['salon-new'] });
    expect(accounts.setEasyWeek).toHaveBeenCalledWith('salon-new', {
      workspaceSlug: 'the-best-company',
      locationId: uuid,
    });
    expect(tokens.store).toHaveBeenCalledWith('salon-new', CrmType.EASYWEEK, {
      apiKey: 'fresh-key',
    });
  });

  it('re-stores the key and workspace when adopting an ownerless salon', async () => {
    prisma.salon.findFirst.mockResolvedValue({
      id: 'salon-old',
      ownerUserId: null,
      bookingUrl: null,
    });

    await expect(link()).resolves.toEqual({ salonIds: ['salon-old'] });
    expect(prisma.salon.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'salon-old' },
        data: expect.objectContaining({ ownerUserId: userId }),
      }),
    );
    expect(prisma.salon.create).not.toHaveBeenCalled();
    expect(accounts.setEasyWeek).toHaveBeenCalledWith('salon-old', {
      workspaceSlug: 'the-best-company',
      locationId: uuid,
    });
    expect(tokens.store).toHaveBeenCalledWith('salon-old', CrmType.EASYWEEK, {
      apiKey: 'fresh-key',
    });
  });

  it('refreshes the key and the booking URL when the same owner links again', async () => {
    prisma.salon.findFirst.mockResolvedValue({
      id: 'salon-old',
      ownerUserId: userId,
      bookingUrl: 'https://booking.easyweek.com.ua/old-workspace',
    });

    await link('rotated-key', 'new-workspace');
    // The salon now syncs against new-workspace; its public booking link must not
    // keep sending clients to the old one.
    expect(prisma.salon.update).toHaveBeenCalledWith({
      where: { id: 'salon-old' },
      data: { bookingUrl: 'https://booking.easyweek.com.ua/new-workspace' },
    });
    expect(accounts.setEasyWeek).toHaveBeenCalledWith('salon-old', {
      workspaceSlug: 'new-workspace',
      locationId: uuid,
    });
    expect(tokens.store).toHaveBeenCalledWith('salon-old', CrmType.EASYWEEK, {
      apiKey: 'rotated-key',
    });
  });

  it('still refuses a salon owned by someone else', async () => {
    prisma.salon.findFirst.mockResolvedValue({
      id: 'salon-old',
      ownerUserId: 'someone-else',
      bookingUrl: null,
    });

    await expect(link()).rejects.toThrow(/already linked/);
    expect(tokens.store).not.toHaveBeenCalled();
  });
});
