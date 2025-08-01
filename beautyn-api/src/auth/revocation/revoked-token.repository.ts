import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { RevokedToken } from '@prisma/client';

@Injectable()
export class RevokedTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  add(jti: string, expiresAt: Date): Promise<RevokedToken> {
    return this.prisma.revokedToken.create({ data: { jti, expiresAt } });
  }

  isRevoked(jti: string): Promise<boolean> {
    return this.prisma.revokedToken
      .findUnique({ where: { jti } })
      .then(Boolean);
  }
}
