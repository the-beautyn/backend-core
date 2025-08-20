import { createHmac } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import { AltegioWebhookService } from '../../src/crm-integration/webhooks/altegio-webhook.service';

describe('AltegioWebhookService', () => {
  beforeEach(() => {
    process.env.ALTEGIO_WEBHOOK_SECRET = 'secret';
  });

  it('processes connect webhook', async () => {
    const tokenRow = { id: '1', salonId: 'salon1', expiresAt: new Date(Date.now() + 1000) };
    const prisma = {
      crmLinkToken: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ ...tokenRow, used: false })
          .mockResolvedValueOnce(null),
        update: jest.fn().mockResolvedValue({ ...tokenRow, used: true }),
      },
    } as any;
    const crm = {
      linkAltegio: jest.fn().mockResolvedValue(undefined),
      enqueueInitialSync: jest.fn().mockResolvedValue(undefined),
    } as any;
    const onboarding = { markCrmLinked: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new AltegioWebhookService(prisma, crm, onboarding);
    const raw = 'data';
    const sig = createHmac('sha256', 'secret').update(raw).digest('hex');
    const first = await service.handleConnect({
      linkToken: 't',
      externalSalonId: 'ext',
      userDataRaw: raw,
      signatureHex: sig,
    });
    expect(first).toBe('ok');
    expect(prisma.crmLinkToken.update).toHaveBeenCalled();
    expect(crm.linkAltegio).toHaveBeenCalledWith({ salonId: 'salon1', externalSalonId: 'ext' });
    expect(crm.enqueueInitialSync).toHaveBeenCalledWith('salon1');
    expect(onboarding.markCrmLinked).toHaveBeenCalledWith('salon1', 'ALTEGIO');

    await expect(
      service.handleConnect({ linkToken: 't', externalSalonId: 'ext', userDataRaw: raw, signatureHex: sig })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns bad-signature on invalid signature', async () => {
    const prisma = { crmLinkToken: { findFirst: jest.fn() } } as any;
    const service = new AltegioWebhookService(
      prisma,
      { linkAltegio: jest.fn(), enqueueInitialSync: jest.fn() } as any,
      { markCrmLinked: jest.fn() } as any,
    );
    const res = await service.handleConnect({
      linkToken: 't',
      externalSalonId: 'ext',
      userDataRaw: 'raw',
      signatureHex: 'bad',
    });
    expect(res).toBe('bad-signature');
    expect(prisma.crmLinkToken.findFirst).not.toHaveBeenCalled();
  });
});
