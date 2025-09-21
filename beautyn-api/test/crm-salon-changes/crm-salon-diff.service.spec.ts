import { CrmSalonDiffService } from '../../src/crm-salon-changes/crm-salon-diff.service';
import { PrismaService } from '../../src/shared/database/prisma.service';
import { canonicalHash } from '../../src/crm-salon-changes/crm-salon-normalizer';
import { CrmSalonChangeStatus } from '@prisma/client';

type MockedPrisma = {
  salon: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  crmSalonLastHash: {
    findMany: jest.Mock;
    upsert: jest.Mock;
  };
  crmSalonSnapshot: {
    create: jest.Mock;
  };
  crmSalonChangeProposal: {
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    findMany: jest.Mock;
  };
  salonImage: {
    deleteMany: jest.Mock;
    createMany: jest.Mock;
  };
  $transaction: jest.Mock;
};

function createPrismaMock(overrides?: Partial<MockedPrisma>): { prisma: PrismaService; mocks: MockedPrisma } {
  const snapshotCreate = jest.fn().mockResolvedValue(undefined);
  const lastHashFindMany = jest.fn().mockResolvedValue([]);
  const lastHashUpsert = jest.fn().mockResolvedValue(undefined);
  const proposalCreate = jest.fn().mockResolvedValue(undefined);
  const proposalFindUnique = jest.fn();
  const proposalUpdate = jest.fn().mockResolvedValue(undefined);
  const proposalFindMany = jest.fn().mockResolvedValue([]);
  const salonFindUnique = jest.fn().mockResolvedValue({
    id: 'salon-1',
    provider: 'ALTEGIO',
    name: 'Local Salon',
    description: null,
    coverImageUrl: null,
    country: null,
    city: null,
    addressLine: null,
    latitude: null,
    longitude: null,
    workingSchedule: null,
    timezone: null,
    externalSalonId: 'ext-1',
    images: [],
  });
  const salonUpdate = jest.fn().mockResolvedValue(undefined);
  const salonImageDeleteMany = jest.fn().mockResolvedValue(undefined);
  const salonImageCreateMany = jest.fn().mockResolvedValue(undefined);

  const tx = {
    crmSalonSnapshot: { create: snapshotCreate },
    crmSalonLastHash: { upsert: lastHashUpsert },
    crmSalonChangeProposal: { create: proposalCreate, findUnique: proposalFindUnique, update: proposalUpdate },
    salon: { update: salonUpdate },
    salonImage: { deleteMany: salonImageDeleteMany, createMany: salonImageCreateMany },
  };

  const prisma = {
    salon: { findUnique: salonFindUnique, update: salonUpdate },
    crmSalonLastHash: { findMany: lastHashFindMany, upsert: lastHashUpsert },
    crmSalonSnapshot: { create: snapshotCreate },
    crmSalonChangeProposal: { create: proposalCreate, findUnique: proposalFindUnique, update: proposalUpdate, findMany: proposalFindMany },
    salonImage: { deleteMany: salonImageDeleteMany, createMany: salonImageCreateMany },
    $transaction: jest.fn(async (cb) => cb(tx as any)),
  } as unknown as PrismaService;

  const mocks: MockedPrisma = {
    salon: prisma.salon as any,
    crmSalonLastHash: prisma.crmSalonLastHash as any,
    crmSalonSnapshot: prisma.crmSalonSnapshot as any,
    crmSalonChangeProposal: prisma.crmSalonChangeProposal as any,
    salonImage: prisma.salonImage as any,
    $transaction: prisma.$transaction as any,
  };

  if (overrides) {
    Object.assign(mocks, overrides);
  }

  return { prisma, mocks };
}

describe('CrmSalonDiffService', () => {
  test('detectChanges skips when CRM payload unchanged', async () => {
    const existingHash = canonicalHash('Local Salon', ['name']);
    const { prisma, mocks } = createPrismaMock();
    mocks.crmSalonLastHash.findMany.mockResolvedValueOnce([
      { fieldPath: 'name', lastCrmHash: existingHash },
    ]);

    const service = new CrmSalonDiffService(prisma);
    await service.detectChanges('salon-1', 'ALTEGIO', { externalId: 'ext-1', name: 'Local Salon' });

    expect(mocks.crmSalonLastHash.upsert).not.toHaveBeenCalled();
    expect(mocks.crmSalonChangeProposal.create).not.toHaveBeenCalled();
    expect(mocks.crmSalonSnapshot.create).toHaveBeenCalledTimes(1);
  });

  test('detectChanges creates proposal when CRM differs from local', async () => {
    const { prisma, mocks } = createPrismaMock();
    mocks.crmSalonLastHash.findMany.mockResolvedValueOnce([
      { fieldPath: 'name', lastCrmHash: 'old-hash' },
    ]);

    const service = new CrmSalonDiffService(prisma);
    await service.detectChanges('salon-1', 'ALTEGIO', { externalId: 'ext-1', name: 'Remote Name' });

    expect(mocks.crmSalonLastHash.upsert).toHaveBeenCalledTimes(1);
    expect(mocks.crmSalonChangeProposal.create).toHaveBeenCalledTimes(1);
    const createCall = mocks.crmSalonChangeProposal.create.mock.calls[0][0];
    expect(createCall.data.fieldPath).toEqual('name');
    expect(createCall.data.newValue).toEqual('Remote Name');
    expect(createCall.data.oldValue).toEqual('Local Salon');
  });

  test('detectChanges seeds hashes without proposals on first pull', async () => {
    const { prisma, mocks } = createPrismaMock();
    (mocks.salon.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'salon-1',
      provider: 'ALTEGIO',
      name: null,
      description: null,
      coverImageUrl: null,
      country: null,
      city: null,
      addressLine: null,
      latitude: null,
      longitude: null,
      workingSchedule: null,
      timezone: null,
      externalSalonId: 'ext-1',
      images: [],
    });

    const service = new CrmSalonDiffService(prisma);
    await service.detectChanges('salon-1', 'ALTEGIO', { externalId: 'ext-1', name: 'Remote Name' });

    expect(mocks.crmSalonLastHash.upsert).toHaveBeenCalledTimes(1);
    expect(mocks.crmSalonChangeProposal.create).not.toHaveBeenCalled();
  });

  test('detectChanges advances hash without proposal when local already matches', async () => {
    const { prisma, mocks } = createPrismaMock();
    mocks.crmSalonLastHash.findMany.mockResolvedValueOnce([
      { fieldPath: 'name', lastCrmHash: 'old-hash' },
    ]);

    const service = new CrmSalonDiffService(prisma);
    await service.detectChanges('salon-1', 'ALTEGIO', { externalId: 'ext-1', name: 'Local Salon' });

    expect(mocks.crmSalonLastHash.upsert).toHaveBeenCalledTimes(1);
    expect(mocks.crmSalonChangeProposal.create).not.toHaveBeenCalled();
  });

  test('acceptChange updates only targeted field and marks accepted', async () => {
    const { prisma, mocks } = createPrismaMock();
    mocks.crmSalonChangeProposal.findUnique.mockResolvedValueOnce({
      id: 'proposal-1',
      salonId: 'salon-1',
      provider: 'ALTEGIO',
      fieldPath: 'name',
      newValue: 'Updated Name',
      status: CrmSalonChangeStatus.pending,
      salon: { ownerUserId: 'user-1' },
    });

    const service = new CrmSalonDiffService(prisma);
    await service.acceptChange('proposal-1', 'user-1');

    expect(mocks.salon.update).toHaveBeenCalledWith({
      where: { id: 'salon-1' },
      data: { name: 'Updated Name' },
    });
    expect(mocks.crmSalonChangeProposal.update).toHaveBeenCalledWith({
      where: { id: 'proposal-1' },
      data: expect.objectContaining({ status: CrmSalonChangeStatus.accepted, decidedBy: 'user-1' }),
    });
  });

  test('dismissChange leaves salon untouched and flags dismissed', async () => {
    const { prisma, mocks } = createPrismaMock();
    mocks.crmSalonChangeProposal.findUnique.mockResolvedValueOnce({
      id: 'proposal-2',
      salonId: 'salon-1',
      fieldPath: 'name',
      status: CrmSalonChangeStatus.pending,
      salon: { ownerUserId: 'user-1' },
    });

    const service = new CrmSalonDiffService(prisma);
    await service.dismissChange('proposal-2', 'user-1');

    expect(mocks.salon.update).not.toHaveBeenCalled();
    expect(mocks.crmSalonChangeProposal.update).toHaveBeenCalledWith({
      where: { id: 'proposal-2' },
      data: expect.objectContaining({ status: CrmSalonChangeStatus.dismissed, decidedBy: 'user-1' }),
    });
  });
});
