import { Logger } from '@nestjs/common';
import * as twilio from 'twilio';
import { SmsProvider } from './sms-provider.interface';

export class TwilioSmsProvider implements SmsProvider {
  private readonly logger = new Logger(TwilioSmsProvider.name);
  private readonly client: twilio.Twilio;
  private readonly verifyServiceSid: string;

  constructor(accountSid: string, authToken: string, verifyServiceSid: string) {
    this.client = twilio.default(accountSid, authToken);
    this.verifyServiceSid = verifyServiceSid;
  }

  async sendOtp(phone: string): Promise<void> {
    await this.client.verify.v2
      .services(this.verifyServiceSid)
      .verifications.create({ to: phone, channel: 'sms' });
  }

  async verifyOtp(phone: string, code: string): Promise<boolean> {
    const check = await this.client.verify.v2
      .services(this.verifyServiceSid)
      .verificationChecks.create({ to: phone, code });

    return check.status === 'approved';
  }
}
