import { attachSalonToOwnerBrand } from '../../src/brand/attach-salon-to-owner-brand';

// A salon linked after the brand exists used to stay at brand_id = null forever:
// only brand creation ever wrote brand_id. This is the one place every link path
// goes through to put such a salon into the owner's brand.
describe('attachSalonToOwnerBrand', () => {
  const userId = 'user-1';
  const salonId = 'salon-1';
  let tx: {
    $executeRaw: jest.Mock;
    brandMember: { findMany: jest.Mock; updateMany: jest.Mock };
    salon: { updateMany: jest.Mock };
  };
  let db: { $transaction: jest.Mock };

  beforeEach(() => {
    tx = {
      $executeRaw: jest.fn().mockResolvedValue(0),
      brandMember: {
        findMany: jest.fn().mockResolvedValue([{ brandId: 'brand-1' }]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      salon: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    db = { $transaction: jest.fn((cb: any) => cb(tx)) };
  });

  const attach = () => attachSalonToOwnerBrand(db as any, salonId, userId);

  it('attaches the salon and makes it the selected salon when none is picked yet', async () => {
    await expect(attach()).resolves.toBe('attached');

    expect(tx.salon.updateMany).toHaveBeenCalledWith({
      where: { id: salonId, ownerUserId: userId, brandId: null },
      data: { brandId: 'brand-1' },
    });
    expect(tx.brandMember.updateMany).toHaveBeenCalledWith({
      where: { brandId: 'brand-1', userId, lastSelectedSalonId: null },
      data: { lastSelectedSalonId: salonId },
    });
  });

  it('reports "unchanged" when the salon already had a brand (re-pair), still offering it as the selection', async () => {
    tx.salon.updateMany.mockResolvedValue({ count: 0 });
    tx.brandMember.updateMany.mockResolvedValue({ count: 0 });

    await expect(attach()).resolves.toBe('unchanged');
    // The guard on lastSelectedSalonId: null is what keeps an existing pick intact.
    expect(tx.brandMember.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ lastSelectedSalonId: null }) }),
    );
  });

  it('writes nothing when the user has no brand yet (createBrandWithOwner will attach later)', async () => {
    tx.brandMember.findMany.mockResolvedValue([]);

    await expect(attach()).resolves.toBe('no_brand');
    expect(tx.salon.updateMany).not.toHaveBeenCalled();
    expect(tx.brandMember.updateMany).not.toHaveBeenCalled();
  });

  it('writes nothing when the user owns several brands', async () => {
    tx.brandMember.findMany.mockResolvedValue([{ brandId: 'brand-1' }, { brandId: 'brand-2' }]);

    await expect(attach()).resolves.toBe('ambiguous');
    expect(tx.salon.updateMany).not.toHaveBeenCalled();
    expect(tx.brandMember.updateMany).not.toHaveBeenCalled();
  });

  it('only considers brands the user owns, oldest first, at most two', async () => {
    await attach();
    // A manager's salon must not land in the brand they merely work for.
    expect(tx.brandMember.findMany).toHaveBeenCalledWith({
      where: { userId, role: 'owner' },
      select: { brandId: true },
      orderBy: { createdAt: 'asc' },
      take: 2,
    });
  });

  it('runs inside one transaction and takes the owner lock before reading', async () => {
    await attach();

    expect(db.$transaction).toHaveBeenCalledTimes(1);
    const [lockOrder] = tx.$executeRaw.mock.invocationCallOrder;
    const [readOrder] = tx.brandMember.findMany.mock.invocationCallOrder;
    expect(lockOrder).toBeLessThan(readOrder);
    // Tagged template: the key is the interpolated value.
    expect(tx.$executeRaw.mock.calls[0][1]).toBe('owner_brand:user-1');
  });
});
