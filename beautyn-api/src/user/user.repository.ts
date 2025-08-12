import { Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/database/prisma.service';
import { Users } from '@prisma/client';

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
}
