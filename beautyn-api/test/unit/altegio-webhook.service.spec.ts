import { BadRequestException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { AltegioWebhookService } from '../../src/crm-integration/webhooks/altegio-webhook.service';

// The confirm webhook used to burn the pairing code, swallow a failed link at debug
// level, mark the CRM onboarding step done and answer 'ok' regardless — so an owner
// could reach the Brand step with no salon at all (BEA-75). The code is now claimed
// atomically up front and handed back when nothing linked.
describe('AltegioWebhookService.confirm', () => {
  const code = '123456';
  const userId = 'user-1';
  let row: { id: string; userId: string; codeHash: string; usedAt: Date | null; attempts: number; expiresAt: Date };
  let prisma: { crmPairingCode: { findFirst: jest.Mock; update: jest.Mock; updateMany: jest.Mock } };
  let partner: { confirmRegistration: jest.Mock };
  let onboarding: { markCrmLinkedByUser: jest.Mock };
  let crm: { linkAltegio: jest.Mock };
  let service: AltegioWebhookService;
  let logs: { error: jest.SpyInstance; warn: jest.SpyInstance };

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
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    partner = { confirmRegistration: jest.fn().mockResolvedValue(undefined) };
    onboarding = { markCrmLinkedByUser: jest.fn().mockResolvedValue(undefined) };
    crm = { linkAltegio: jest.fn().mockResolvedValue({ salonIds: ['salon-1'] }) };
    service = new AltegioWebhookService(prisma as any, partner as any, onboarding as any, crm as any);
    const logger = (service as any).logger;
    logs = {
      error: jest.spyOn(logger, 'error').mockImplementation(() => undefined),
      warn: jest.spyOn(logger, 'warn').mockImplementation(() => undefined),
    };
  });

  const confirm = (externalSalonIds = ['1312212']) => service.confirm({ code, externalSalonIds });
  const conflict = () => new BadRequestException('Altegio salon already linked to another user');
  const codeClaimed = () =>
    prisma.crmPairingCode.updateMany.mock.calls.some(
      ([args]) => args.where.id === row.id && args.where.usedAt === null && args.data.usedAt instanceof Date,
    );
  const codeReleased = () =>
    prisma.crmPairingCode.update.mock.calls.some(([args]) => args.where.id === row.id && args.data.usedAt === null);

  it('claims the code, links and marks the CRM step on success', async () => {
    await expect(confirm()).resolves.toBe('ok');

    expect(crm.linkAltegio).toHaveBeenCalledWith({ userId, externalSalonIds: ['1312212'] });
    expect(codeClaimed()).toBe(true);
    expect(codeReleased()).toBe(false);
    expect(onboarding.markCrmLinkedByUser).toHaveBeenCalledWith(userId);
    // The claim guards the whole partner/link work, so it comes before the link.
    const [claimOrder] = prisma.crmPairingCode.updateMany.mock.invocationCallOrder;
    const [linkOrder] = crm.linkAltegio.mock.invocationCallOrder;
    expect(claimOrder).toBeLessThan(linkOrder);
  });

  it('answers invalid when another confirm already claimed the code', async () => {
    prisma.crmPairingCode.updateMany.mockResolvedValue({ count: 0 });

    await expect(confirm()).resolves.toBe('invalid');
    expect(partner.confirmRegistration).not.toHaveBeenCalled();
    expect(crm.linkAltegio).not.toHaveBeenCalled();
  });

  it('reports link_failed, hands the code back and leaves onboarding alone when linking blows up', async () => {
    crm.linkAltegio.mockRejectedValue(new Error('db down'));

    await expect(confirm()).resolves.toBe('link_failed');

    expect(codeReleased()).toBe(true);
    expect(onboarding.markCrmLinkedByUser).not.toHaveBeenCalled();
    expect(logs.error).toHaveBeenCalledWith(expect.stringContaining('db down'), expect.anything());
  });

  it('surfaces a salon owned by someone else as the 400 it is, handing the code back', async () => {
    crm.linkAltegio.mockRejectedValue(conflict());

    await expect(confirm()).rejects.toThrow(/already linked to another user/);

    expect(codeReleased()).toBe(true);
    expect(onboarding.markCrmLinkedByUser).not.toHaveBeenCalled();
  });

  it('hands the code back when the Altegio partner call fails', async () => {
    partner.confirmRegistration.mockRejectedValue(new Error('altegio 500'));

    await expect(confirm()).rejects.toThrow('altegio 500');
    expect(codeReleased()).toBe(true);
    expect(crm.linkAltegio).not.toHaveBeenCalled();
  });

  describe('several salons in one install', () => {
    it('is ok when one salon fails for a technical reason and another links', async () => {
      crm.linkAltegio.mockRejectedValueOnce(new Error('first one broke')).mockResolvedValueOnce({ salonIds: ['salon-2'] });

      await expect(confirm(['1', '2'])).resolves.toBe('ok');

      expect(crm.linkAltegio).toHaveBeenCalledTimes(2);
      expect(codeReleased()).toBe(false);
      expect(onboarding.markCrmLinkedByUser).toHaveBeenCalledWith(userId);
    });

    it('does not let one salon owned by someone else block the others', async () => {
      crm.linkAltegio.mockRejectedValueOnce(conflict()).mockResolvedValueOnce({ salonIds: ['salon-2'] });

      await expect(confirm(['1', '2'])).resolves.toBe('ok');

      expect(crm.linkAltegio).toHaveBeenCalledTimes(2);
      expect(logs.warn).toHaveBeenCalledWith(expect.stringContaining('salon 1 not linked'));
      expect(codeReleased()).toBe(false);
      expect(onboarding.markCrmLinkedByUser).toHaveBeenCalledWith(userId);
    });

    it('surfaces the conflict only when nothing at all linked', async () => {
      crm.linkAltegio.mockRejectedValueOnce(conflict()).mockRejectedValueOnce(new Error('second one broke'));

      await expect(confirm(['1', '2'])).rejects.toThrow(/already linked to another user/);

      expect(crm.linkAltegio).toHaveBeenCalledTimes(2);
      expect(codeReleased()).toBe(true);
      expect(onboarding.markCrmLinkedByUser).not.toHaveBeenCalled();
    });
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
    expect(codeClaimed()).toBe(false);
  });
});
