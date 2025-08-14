import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly cfg: ConfigService) {}

  get nodeEnv() {
    return this.cfg.get<string>('NODE_ENV') ?? 'dev';
  }
}
