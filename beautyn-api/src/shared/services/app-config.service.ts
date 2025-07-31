import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly cfg: ConfigService) {}

  get nodeEnv() {
    return this.cfg.get<string>('NODE_ENV') ?? 'development';
  }

  get jwtSecret() {
    const secret = this.cfg.get<string>('JWT_SECRET');
    if (!secret && this.nodeEnv !== 'development') {
      throw new Error('[Config] JWT_SECRET is required in production.');
    }
    return secret ?? 'dev-secret';
  }

  get jwtExpiresIn() {
    return '30d';
  }
}
