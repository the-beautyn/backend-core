import { attachSalonToOwnerBrand } from '../../src/brand/attach-salon-to-owner-brand';

// A salon linked after the brand exists used to stay at brand_id = null forever:
// only brand creation ever wrote brand_id. This is the one place every link path
// goes through to put such a salon into the owner's brand.
describe('attachSalonToOwnerBrand', () => {
  const userId = 'user-1';
  const salonId = 'salon-1';
  let db: {
    brandMember: { findMany: jest.Mock; updateMany: jest.Mock };
    salon: { updateMany: jest.Mock };
  };

  beforeEach(() => {
    db = {
      brandMember: {
        findMany: jest.fn().mockResolvedValue([{ brandId: 'brand-1' }]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      salon: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
  });

  const attach = () => attachSalonToOwnerBrand(db as any, salonId, userId);

  it('attaches the salon and makes it the selected salon when none is picked yet', async () => {
    await expect(attach()).resolves.toBe('attached');

    expect(db.salon.updateMany).toHaveBeenCalledWith({
      where: { id: salonId, ownerUserId: userId, brandId: null },
      data: { brandId: 'brand-1' },
    });
    expect(db.brandMember.updateMany).toHaveBeenCalledWith({
      where: { brandId: 'brand-1', userId, lastSelectedSalonId: null },
      data: { lastSelectedSalonId: salonId },
    });
  });

  it('reports "unchanged" when the salon already had a brand (re-pair), still offering it as the selection', async () => {
    db.salon.updateMany.mockResolvedValue({ count: 0 });
    db.brandMember.updateMany.mockResolvedValue({ count: 0 });

    await expect(attach()).resolves.toBe('unchanged');
    // The guard on lastSelectedSalonId: null is what keeps an existing pick intact.
    expect(db.brandMember.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ lastSelectedSalonId: null }) }),
    );
  });

  it('writes nothing when the user has no brand yet (createBrandWithOwner will attach later)', async () => {
    db.brandMember.findMany.mockResolvedValue([]);

    await expect(attach()).resolves.toBe('no_brand');
    expect(db.salon.updateMany).not.toHaveBeenCalled();
    expect(db.brandMember.updateMany).not.toHaveBeenCalled();
  });

  it('writes nothing when the user belongs to several brands', async () => {
    db.brandMember.findMany.mockResolvedValue([{ brandId: 'brand-1' }, { brandId: 'brand-2' }]);

    await expect(attach()).resolves.toBe('ambiguous');
    expect(db.salon.updateMany).not.toHaveBeenCalled();
    expect(db.brandMember.updateMany).not.toHaveBeenCalled();
  });

  it('asks for at most two memberships, oldest first', async () => {
    await attach();
    expect(db.brandMember.findMany).toHaveBeenCalledWith({
      where: { userId },
      select: { brandId: true },
      orderBy: { createdAt: 'asc' },
      take: 2,
    });
  });
});
