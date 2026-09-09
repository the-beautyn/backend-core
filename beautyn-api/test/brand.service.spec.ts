import { BrandService } from '../src/brand/brand.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('BrandService', () => {
  const repo = {
    listBrandsForUser: jest.fn(),
    createBrandWithOwner: jest.fn(),
    findBrandById: jest.fn(),
    updateBrandName: jest.fn(),
    listSalonsByBrand: jest.fn(),
    findMembership: jest.fn(),
    findSalonWithBrand: jest.fn(),
    updateLastSelectedSalon: jest.fn(),
  } as any;

  const salonService = {
    listByBrand: jest.fn(),
  } as any;

  const syncScheduler = {
    scheduleSync: jest.fn(),
  } as any;

  const service = new BrandService(repo, salonService, syncScheduler);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('throws if user already has a brand', async () => {
    repo.listBrandsForUser.mockResolvedValue([{ id: 'b1' }]);
    await expect(service.createBrand('u1', { name: 'Test' } as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(syncScheduler.scheduleSync).not.toHaveBeenCalled();
  });

  describe('createBrand initial sync', () => {
    const brand = {
      id: 'b1',
      name: 'Acme',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    beforeEach(() => {
      repo.listBrandsForUser.mockResolvedValue([]);
      repo.createBrandWithOwner.mockResolvedValue(brand);
    });

    it('enqueues an initial sync for every CRM-linked salon attached to the brand', async () => {
      repo.listSalonsByBrand.mockResolvedValue([
        { id: 's1', provider: 'EASYWEEK' },
        { id: 's2', provider: 'ALTEGIO' },
      ]);
      syncScheduler.scheduleSync.mockResolvedValue('job');

      const res = await service.createBrand('u1', { name: ' Acme ' } as any);

      expect(res).toMatchObject({ id: 'b1', name: 'Acme', salons_count: 2 });
      expect(syncScheduler.scheduleSync).toHaveBeenCalledTimes(2);
      expect(syncScheduler.scheduleSync).toHaveBeenCalledWith(
        { salonId: 's1', provider: 'EASYWEEK' },
        { type: 'initial' },
      );
      expect(syncScheduler.scheduleSync).toHaveBeenCalledWith(
        { salonId: 's2', provider: 'ALTEGIO' },
        { type: 'initial' },
      );
    });

    it('skips salons without a CRM provider', async () => {
      repo.listSalonsByBrand.mockResolvedValue([{ id: 's1', provider: null }]);

      await service.createBrand('u1', { name: 'Acme' } as any);

      expect(syncScheduler.scheduleSync).not.toHaveBeenCalled();
    });

    it('still creates the brand when enqueueing fails', async () => {
      repo.listSalonsByBrand.mockResolvedValue([
        { id: 's1', provider: 'EASYWEEK' },
      ]);
      syncScheduler.scheduleSync.mockRejectedValue(new Error('redis down'));

      const res = await service.createBrand('u1', { name: 'Acme' } as any);

      expect(res).toMatchObject({ id: 'b1', salons_count: 1 });
    });
  });

  it('returns brand list', async () => {
    repo.listBrandsForUser.mockResolvedValue([
      { id: 'b1', name: 'A', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-02'), _count: { salons: 2 } },
    ]);
    const res = await service.listMyBrands('u1');
    expect(res).toEqual([
      {
        id: 'b1',
        name: 'A',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-02'),
        salons_count: 2,
      },
    ]);
  });

  it('listMyBrands throws when none found', async () => {
    repo.listBrandsForUser.mockResolvedValue([]);
    await expect(service.listMyBrands('u1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('renameBrand rejects non-owner', async () => {
    repo.findMembership.mockResolvedValue({ role: 'manager' });
    await expect(service.renameBrand('u1', 'b1', { name: 'New' } as any)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('getBrandMember returns membership info', async () => {
    repo.findMembership.mockResolvedValue({
      id: 'm1',
      brandId: 'b1',
      userId: 'u1',
      role: 'owner',
      lastSelectedSalonId: 's1',
      createdAt: new Date('2024-01-01'),
    });
    const res = await service.getBrandMember('u1', 'b1');
    expect(res).toEqual({
      id: 'm1',
      brand_id: 'b1',
      user_id: 'u1',
      role: 'owner',
      last_selected_salon_id: 's1',
      created_at: new Date('2024-01-01'),
    });
  });

  it('setLastSelectedSalon updates membership when salon belongs to brand', async () => {
    repo.findMembership.mockResolvedValue({ id: 'm1', brandId: 'b1', userId: 'u1', role: 'owner' });
    repo.findSalonWithBrand.mockResolvedValue({ id: 's1', brandId: 'b1' });
    repo.updateLastSelectedSalon.mockResolvedValue({
      id: 'm1',
      brandId: 'b1',
      userId: 'u1',
      role: 'owner',
      lastSelectedSalonId: 's1',
      createdAt: new Date('2024-01-01'),
    });
    const res = await service.setLastSelectedSalon('u1', 'b1', 's1');
    expect(res).toEqual({
      id: 'm1',
      brand_id: 'b1',
      user_id: 'u1',
      role: 'owner',
      last_selected_salon_id: 's1',
      created_at: new Date('2024-01-01'),
    });
  });
});
