import { Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/database/prisma.service';
import { UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.users.findUnique({ where: { email } });
  }

  create(email: string, role: UserRole) {
    return this.prisma.users.create({
      data: { 
        id: randomUUID(),
        email, 
        role 
      },
    });
  }
}
