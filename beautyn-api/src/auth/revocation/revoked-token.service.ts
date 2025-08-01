import { Injectable } from '@nestjs/common';
import { RevokedTokenRepository } from './revoked-token.repository';

@Injectable()
export class RevokedTokenService {
  constructor(private readonly repo: RevokedTokenRepository) {}

  async revoke(jti: string, exp: number): Promise<RevokedToken> {
    return await this.repo.add(jti, new Date(exp * 1000));
  }

  isRevoked(jti: string) {
    return this.repo.isRevoked(jti);
  }
}
