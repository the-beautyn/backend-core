import { Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/database/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  create(email: string, passwordHash: string, role: UserRole) {
    return this.prisma.user.create({
      data: { email, passwordHash, role },
    });
  }
}
