import { Injectable } from '@nestjs/common';
import { RevokedTokenRepository } from './revoked-token.repository';

@Injectable()
export class RevokedTokenService {
  constructor(private readonly repo: RevokedTokenRepository) {}

  revoke(jti: string, exp: number) {
    return this.repo.add(jti, new Date(exp * 1000));
  }

  isRevoked(jti: string) {
    return this.repo.isRevoked(jti);
  }
}
