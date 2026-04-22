import { Logger } from '@nestjs/common';
import { SmsProvider } from './sms-provider.interface';

export class MockSmsProvider implements SmsProvider {
  private readonly logger = new Logger(MockSmsProvider.name);

  async sendOtp(phone: string): Promise<void> {
    this.logger.log(`[MOCK] OTP sent to ${phone} — any code will be accepted`);
  }

  async verifyOtp(phone: string, code: string): Promise<boolean> {
    this.logger.log(`[MOCK] OTP verified for ${phone} with code ${code}`);
    return true;
  }
}
