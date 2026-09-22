import { BadRequestException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { AltegioWebhookService } from '../../src/crm-integration/webhooks/altegio-webhook.service';

// The confirm webhook used to burn the pairing code, swallow a failed link at debug
// level, mark the CRM onboarding step done and answer 'ok' regardless — so an owner
// could reach the Brand step with no salon at all (BEA-75).
describe('AltegioWebhookService.confirm', () => {
  const code = '123456';
  const userId = 'user-1';
  let row: { id: string; userId: string; codeHash: string; usedAt: Date | null; attempts: number; expiresAt: Date };
  let prisma: { crmPairingCode: { findFirst: jest.Mock; update: jest.Mock } };
  let partner: { confirmRegistration: jest.Mock };
  let onboarding: { markCrmLinkedByUser: jest.Mock };
  let crm: { linkAltegio: jest.Mock };
  let service: AltegioWebhookService;

  beforeEach(() => {
    process.env.PAIRING_CODE_PEPPER = 'test-pepper';
    row = {
      id: 'code-1',
      userId,
      codeHash: createHmac('sha256', 'test-pepper').update(code).digest('hex'),
      usedAt: null,
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
    };
    prisma = {
      crmPairingCode: {
        findFirst: jest.fn().mockResolvedValue(row),
        update: jest.fn().mockResolvedValue(undefined),
      },
    };
    partner = { confirmRegistration: jest.fn().mockResolvedValue(undefined) };
    onboarding = { markCrmLinkedByUser: jest.fn().mockResolvedValue(undefined) };
    crm = { linkAltegio: jest.fn().mockResolvedValue({ salonIds: ['salon-1'] }) };
    service = new AltegioWebhookService(prisma as any, partner as any, onboarding as any, crm as any);
    jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
  });

  const confirm = (externalSalonIds = ['1312212']) => service.confirm({ code, externalSalonIds });
  const codeBurned = () =>
    prisma.crmPairingCode.update.mock.calls.some(([args]) => args.where.id === row.id && args.data.usedAt);

  it('links, burns the code and marks the CRM step on success', async () => {
    await expect(confirm()).resolves.toBe('ok');

    expect(crm.linkAltegio).toHaveBeenCalledWith({ userId, externalSalonIds: ['1312212'] });
    expect(codeBurned()).toBe(true);
    expect(onboarding.markCrmLinkedByUser).toHaveBeenCalledWith(userId);
    // The code is burned only after the link, never before.
    const linkOrder = crm.linkAltegio.mock.invocationCallOrder[0];
    const burnOrder = prisma.crmPairingCode.update.mock.invocationCallOrder[0];
    expect(linkOrder).toBeLessThan(burnOrder);
  });

  it('reports link_failed, keeps the code valid and leaves onboarding alone when linking blows up', async () => {
    crm.linkAltegio.mockRejectedValue(new Error('db down'));

    await expect(confirm()).resolves.toBe('link_failed');

    expect(codeBurned()).toBe(false);
    expect(onboarding.markCrmLinkedByUser).not.toHaveBeenCalled();
    expect((service as any).logger.error).toHaveBeenCalledWith(expect.stringContaining('db down'), expect.anything());
  });

  it('surfaces a salon owned by someone else as the 400 it is, without burning the code', async () => {
    crm.linkAltegio.mockRejectedValue(new BadRequestException('Altegio salon already linked to another user'));

    await expect(confirm()).rejects.toThrow(/already linked to another user/);

    expect(codeBurned()).toBe(false);
    expect(onboarding.markCrmLinkedByUser).not.toHaveBeenCalled();
  });

  it('is ok when at least one of several salons links', async () => {
    crm.linkAltegio.mockRejectedValueOnce(new Error('first one broke')).mockResolvedValueOnce({ salonIds: ['salon-2'] });

    await expect(confirm(['1', '2'])).resolves.toBe('ok');

    expect(crm.linkAltegio).toHaveBeenCalledTimes(2);
    expect(codeBurned()).toBe(true);
    expect(onboarding.markCrmLinkedByUser).toHaveBeenCalledWith(userId);
  });

  it('still rejects an unknown, used or expired code before touching Altegio', async () => {
    prisma.crmPairingCode.findFirst.mockResolvedValueOnce(null);
    await expect(confirm()).resolves.toBe('invalid');

    prisma.crmPairingCode.findFirst.mockResolvedValueOnce({ ...row, usedAt: new Date() });
    await expect(confirm()).resolves.toBe('invalid');

    prisma.crmPairingCode.findFirst.mockResolvedValueOnce({ ...row, expiresAt: new Date(Date.now() - 1) });
    await expect(confirm()).resolves.toBe('expired');

    expect(partner.confirmRegistration).not.toHaveBeenCalled();
    expect(crm.linkAltegio).not.toHaveBeenCalled();
  });
});
