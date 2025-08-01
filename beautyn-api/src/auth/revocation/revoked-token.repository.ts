import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { RevokedToken } from '@prisma/client';

@Injectable()
export class RevokedTokenRepository {
  private cache = new Map<string, NodeJS.Timeout>();

  constructor(private readonly prisma: PrismaService) {}

  add(jti: string, expiresAt: Date): Promise<RevokedToken> {
    const ttl = expiresAt.getTime() - Date.now();
    if (ttl > 0) {
      // Add to cache with automatic removal after expiration
      const timeout = setTimeout(() => this.cache.delete(jti), ttl);
      this.cache.set(jti, timeout);
    }
    return this.prisma.revokedToken.create({ data: { jti, expiresAt } });
  }

  async isRevoked(jti: string): Promise<boolean> {
    // Check cache first
    if (this.cache.has(jti)) {
      return true;
    }
    // Fallback to database query
    const isRevoked = await this.prisma.revokedToken
      .findUnique({ where: { jti } })
      .then(Boolean);
    if (isRevoked) {
      // Add to cache if found in database
      const token = await this.prisma.revokedToken.findUnique({ where: { jti } });
      const ttl = token.expiresAt.getTime() - Date.now();
      if (ttl > 0) {
        const timeout = setTimeout(() => this.cache.delete(jti), ttl);
        this.cache.set(jti, timeout);
      }
    }
    return isRevoked;
  }
}
