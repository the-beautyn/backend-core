import { OnboardingService } from '../../src/onboarding/onboarding.service';

// Six-digit pairing codes are not unique. A code another owner is holding live
// right now is never handed out again: the confirm webhook would refuse the
// collision and both owners would only see "invalid code".
describe('OnboardingService.generateAltegioPairCode', () => {
  const userId = 'user-1';
  let prisma: { crmPairingCode: { findFirst: jest.Mock; create: jest.Mock } };
  let service: OnboardingService;

  beforeEach(() => {
    process.env.PAIRING_CODE_PEPPER = 'test-pepper';
    prisma = {
      crmPairingCode: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(undefined),
      },
    };
    service = new OnboardingService(prisma as any, {} as any, {} as any, {} as any);
  });

  it('stores a six-digit code that is not live for anyone else', async () => {
    const { code, expiresAt } = await service.generateAltegioPairCode(userId);

    expect(code).toMatch(/^\d{6}$/);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(prisma.crmPairingCode.findFirst).toHaveBeenCalledWith({
      where: { provider: 'ALTEGIO', codeHash: expect.any(String), usedAt: null, expiresAt: { gt: expect.any(Date) } },
      select: { id: true },
    });
    expect(prisma.crmPairingCode.create).toHaveBeenCalledTimes(1);
    expect(prisma.crmPairingCode.create.mock.calls[0][0].data).toMatchObject({ provider: 'ALTEGIO', userId });
  });

  it('re-rolls when the code is live for another owner', async () => {
    prisma.crmPairingCode.findFirst.mockResolvedValueOnce({ id: 'someone-elses' }).mockResolvedValueOnce(null);

    await service.generateAltegioPairCode(userId);

    expect(prisma.crmPairingCode.findFirst).toHaveBeenCalledTimes(2);
    expect(prisma.crmPairingCode.create).toHaveBeenCalledTimes(1);
  });

  it('gives up instead of looping forever when every roll collides', async () => {
    prisma.crmPairingCode.findFirst.mockResolvedValue({ id: 'someone-elses' });

    await expect(service.generateAltegioPairCode(userId)).rejects.toThrow(/pairing code/);
    expect(prisma.crmPairingCode.findFirst).toHaveBeenCalledTimes(5);
    expect(prisma.crmPairingCode.create).not.toHaveBeenCalled();
  });
});
