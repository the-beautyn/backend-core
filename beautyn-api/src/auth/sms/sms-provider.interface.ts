export interface SmsProvider {
  sendOtp(phone: string): Promise<void>;
  verifyOtp(phone: string, code: string): Promise<boolean>;
}

export const SMS_PROVIDER = Symbol('SMS_PROVIDER');
