import { Injectable, BadRequestException, ForbiddenException, Inject, Logger, Optional } from '@nestjs/common';
import { SMS_PROVIDER, SmsProvider } from './sms/sms-provider.interface';

const SESSION_TTL_MS = 10 * 60 * 1000;

type VerificationSession = {
  phone: string;
  expiresAt: number;
};

@Injectable()
export class PhoneVerificationService {
  private readonly logger = new Logger(PhoneVerificationService.name);
  // In-memory store: single-instance deploy, acceptable if a restart mid-flow
  // forces the user to request a new OTP. Move to a persistent store if
  // scaling out.
  private readonly sessions = new Map<string, VerificationSession>();

  constructor(
    @Optional() @Inject(SMS_PROVIDER) private readonly smsProvider: SmsProvider | null,
  ) {
    if (!this.smsProvider) {
      this.logger.warn('Phone verification disabled — no SMS provider configured');
      return;
    }
    this.logger.warn(
      'OTP sessions are stored in-memory. This assumes a single API instance — ' +
        'scale out will cause verify-otp to fail non-deterministically when the ' +
        'follow-up request lands on a different replica. Migrate to a shared ' +
        'store (e.g. Redis) before enabling horizontal scaling.',
    );
  }

  async sendOtp(userId: string, phone: string): Promise<void> {
    if (!this.smsProvider) {
      throw new ForbiddenException('Phone verification is disabled');
    }

    try {
      await this.smsProvider.sendOtp(phone);
    } catch (error: any) {
      this.logger.error(`Failed to send OTP to ${phone}: ${error.message}`);
      throw new BadRequestException('Failed to send verification code');
    }

    this.sessions.set(userId, { phone, expiresAt: Date.now() + SESSION_TTL_MS });
  }

  async verifyOtp(userId: string, phone: string, code: string): Promise<boolean> {
    if (!this.smsProvider) {
      throw new ForbiddenException('Phone verification is disabled');
    }

    const session = this.sessions.get(userId);
    if (!session || session.expiresAt < Date.now()) {
      this.sessions.delete(userId);
      throw new BadRequestException('No active verification — request a new code');
    }
    if (session.phone !== phone) {
      throw new BadRequestException('Phone number does not match the one the code was sent to');
    }

    let valid: boolean;
    try {
      valid = await this.smsProvider.verifyOtp(phone, code);
    } catch (error: any) {
      this.logger.error(`Failed to verify OTP for ${phone}: ${error.message}`);
      throw new BadRequestException('Failed to verify code');
    }

    if (valid) {
      this.sessions.delete(userId);
    }
    return valid;
  }

  isEnabled(): boolean {
    return !!this.smsProvider;
  }
}
