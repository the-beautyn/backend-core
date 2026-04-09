import { Injectable, BadRequestException, ForbiddenException, Inject, Logger, Optional } from '@nestjs/common';
import { SMS_PROVIDER, SmsProvider } from './sms/sms-provider.interface';

@Injectable()
export class PhoneVerificationService {
  private readonly logger = new Logger(PhoneVerificationService.name);

  constructor(
    @Optional() @Inject(SMS_PROVIDER) private readonly smsProvider: SmsProvider | null,
  ) {
    if (!this.smsProvider) {
      this.logger.warn('Phone verification disabled — no SMS provider configured');
    }
  }

  async sendOtp(phone: string): Promise<void> {
    if (!this.smsProvider) {
      throw new ForbiddenException('Phone verification is disabled');
    }

    try {
      await this.smsProvider.sendOtp(phone);
    } catch (error: any) {
      this.logger.error(`Failed to send OTP to ${phone}: ${error.message}`);
      throw new BadRequestException('Failed to send verification code');
    }
  }

  async verifyOtp(phone: string, code: string): Promise<boolean> {
    if (!this.smsProvider) {
      throw new ForbiddenException('Phone verification is disabled');
    }

    try {
      return await this.smsProvider.verifyOtp(phone, code);
    } catch (error: any) {
      this.logger.error(`Failed to verify OTP for ${phone}: ${error.message}`);
      throw new BadRequestException('Failed to verify code');
    }
  }

  isEnabled(): boolean {
    return !!this.smsProvider;
  }
}
