import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PhoneVerificationService } from '../../src/auth/phone-verification.service';
import { SmsProvider } from '../../src/auth/sms/sms-provider.interface';

function makeProvider(): jest.Mocked<SmsProvider> {
  return {
    sendOtp: jest.fn().mockResolvedValue(undefined),
    verifyOtp: jest.fn().mockResolvedValue(true),
  };
}

describe('PhoneVerificationService', () => {
  const USER_A = 'user-a';
  const USER_B = 'user-b';
  const PHONE_A = '+380501234567';
  const PHONE_B = '+380509999999';

  describe('sendOtp binds phone to user', () => {
    it('records the phone for the user so subsequent verify succeeds', async () => {
      const provider = makeProvider();
      const service = new PhoneVerificationService(provider);

      await service.sendOtp(USER_A, PHONE_A);
      const valid = await service.verifyOtp(USER_A, PHONE_A, '1234');

      expect(valid).toBe(true);
      expect(provider.sendOtp).toHaveBeenCalledWith(PHONE_A);
      expect(provider.verifyOtp).toHaveBeenCalledWith(PHONE_A, '1234');
    });

    it('a second sendOtp replaces the prior session for that user', async () => {
      const provider = makeProvider();
      const service = new PhoneVerificationService(provider);

      await service.sendOtp(USER_A, PHONE_A);
      await service.sendOtp(USER_A, PHONE_B);

      // Old phone no longer matches — the session is for PHONE_B now.
      await expect(service.verifyOtp(USER_A, PHONE_A, '1234')).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.verifyOtp(USER_A, PHONE_B, '1234')).resolves.toBe(true);
    });
  });

  describe('verifyOtp rejects hijack attempts', () => {
    it('rejects when no session exists for the user', async () => {
      const provider = makeProvider();
      const service = new PhoneVerificationService(provider);

      await expect(service.verifyOtp(USER_A, PHONE_A, '1234')).rejects.toBeInstanceOf(BadRequestException);
      expect(provider.verifyOtp).not.toHaveBeenCalled();
    });

    it('rejects when dto.phone does not match the phone the OTP was sent to', async () => {
      const provider = makeProvider();
      const service = new PhoneVerificationService(provider);

      // Attacker: user A triggers sendOtp to their own phone, then tries to
      // verify victim phone B using a code stolen via social engineering.
      await service.sendOtp(USER_A, PHONE_A);
      await expect(service.verifyOtp(USER_A, PHONE_B, '1234')).rejects.toBeInstanceOf(BadRequestException);
      expect(provider.verifyOtp).not.toHaveBeenCalled();
    });

    it('does not leak another user’s session', async () => {
      const provider = makeProvider();
      const service = new PhoneVerificationService(provider);

      await service.sendOtp(USER_A, PHONE_A);
      // User B never started a flow.
      await expect(service.verifyOtp(USER_B, PHONE_A, '1234')).rejects.toBeInstanceOf(BadRequestException);
      expect(provider.verifyOtp).not.toHaveBeenCalled();
    });

    it('rejects when the session has expired', async () => {
      const provider = makeProvider();
      const service = new PhoneVerificationService(provider);

      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-04-22T10:00:00Z'));
      await service.sendOtp(USER_A, PHONE_A);

      jest.setSystemTime(new Date('2026-04-22T10:11:00Z')); // 11 min later (TTL = 10 min)
      await expect(service.verifyOtp(USER_A, PHONE_A, '1234')).rejects.toBeInstanceOf(BadRequestException);
      expect(provider.verifyOtp).not.toHaveBeenCalled();
      jest.useRealTimers();
    });
  });

  describe('session lifecycle', () => {
    it('consumes the session after a successful verify so the code can’t be reused', async () => {
      const provider = makeProvider();
      const service = new PhoneVerificationService(provider);

      await service.sendOtp(USER_A, PHONE_A);
      await service.verifyOtp(USER_A, PHONE_A, '1234');

      await expect(service.verifyOtp(USER_A, PHONE_A, '1234')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('keeps the session on a failed verify so the user can retry', async () => {
      const provider = makeProvider();
      provider.verifyOtp.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      const service = new PhoneVerificationService(provider);

      await service.sendOtp(USER_A, PHONE_A);
      expect(await service.verifyOtp(USER_A, PHONE_A, 'wrong')).toBe(false);
      expect(await service.verifyOtp(USER_A, PHONE_A, '1234')).toBe(true);
    });
  });

  describe('disabled state', () => {
    it('sendOtp throws ForbiddenException when no SMS provider is configured', async () => {
      const service = new PhoneVerificationService(null);
      await expect(service.sendOtp(USER_A, PHONE_A)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('verifyOtp throws ForbiddenException when no SMS provider is configured', async () => {
      const service = new PhoneVerificationService(null);
      await expect(service.verifyOtp(USER_A, PHONE_A, '1234')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
