import { Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/database/prisma.service';
import { Users, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';

const userSelect = {
  id: true,
  email: true,
  role: true,
  name: true,
  secondName: true,
  phone: true,
  avatarUrl: true,
  isProfileCreated: true,
  isOnboardingCompleted: true,
  subscriptionId: true,
  crmId: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.users.findUnique({ where: { id }, select: userSelect });
  }

  findByEmail(email: string) {
    return this.prisma.users.findUnique({ where: { email }, select: userSelect });
  }

  updateById(id: string, data: Partial<Users>) {
    return this.prisma.users.update({ where: { id }, data, select: userSelect });
  }

  createWithId(id: string, email: string, role: UserRole) {
    return this.prisma.users.create({
      data: { 
        id,          // Use the provided ID (from Supabase)
        email, 
        role 
      },
      select: userSelect
    });
  }
}
