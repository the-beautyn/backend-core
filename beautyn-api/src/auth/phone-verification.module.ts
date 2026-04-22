import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PhoneVerificationService } from './phone-verification.service';
import { SMS_PROVIDER } from './sms/sms-provider.interface';
import { TwilioSmsProvider } from './sms/twilio-sms.provider';
import { MockSmsProvider } from './sms/mock-sms.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    PhoneVerificationService,
    {
      provide: SMS_PROVIDER,
      useFactory: (config: ConfigService) => {
        const logger = new Logger('SmsProviderFactory');
        const enabled = config.get('PHONE_VERIFICATION_ENABLED', 'true') === 'true';

        if (!enabled) {
          logger.warn('Phone verification is disabled (PHONE_VERIFICATION_ENABLED=false)');
          return null;
        }

        const accountSid = config.get<string>('TWILIO_ACCOUNT_SID');
        const authToken = config.get<string>('TWILIO_AUTH_TOKEN');
        const verifySid = config.get<string>('TWILIO_VERIFY_SERVICE_SID');

        if (accountSid && authToken && verifySid) {
          logger.log('Using Twilio SMS provider');
          return new TwilioSmsProvider(accountSid, authToken, verifySid);
        }

        if (config.get('MOCK_SMS', 'false') === 'true') {
          logger.warn('Using mock SMS provider (MOCK_SMS=true) — any code accepted');
          return new MockSmsProvider();
        }

        logger.warn('Phone verification enabled but SMS credentials missing — disabling');
        return null;
      },
      inject: [ConfigService],
    },
  ],
  exports: [PhoneVerificationService],
})
export class PhoneVerificationModule {}
