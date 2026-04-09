import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../shared/database/prisma.service';
import { Users, UserRole, AuthProvider } from '@prisma/client';
import { randomUUID } from 'crypto';
import { isUUID, isEmail } from 'class-validator';

// Max length for email addresses per RFC guidelines
const MAX_EMAIL_LENGTH = 254;

const userSelect = {
  id: true,
  email: true,
  role: true,
  name: true,
  secondName: true,
  phone: true,
  avatarUrl: true,
  authProvider: true,
  isPhoneVerified: true,
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

  createWithId(
    id: string,
    email: string,
    role: UserRole,
    profile?: { name?: string; secondName?: string; phone?: string; authProvider?: AuthProvider },
  ) {
    // Validate UUID format using class-validator
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('id is required and must be a string');
    }
    if (!isUUID(id)) {
      throw new BadRequestException('id must be a valid UUID format');
    }

    // Validate email format using class-validator
    if (!email || typeof email !== 'string') {
      throw new BadRequestException('email is required and must be a string');
    }
    if (!isEmail(email)) {
      throw new BadRequestException('email must be a valid email address');
    }
    if (email.length > MAX_EMAIL_LENGTH) {
      throw new BadRequestException(`email must not exceed ${MAX_EMAIL_LENGTH} characters`);
    }

    return this.prisma.users.create({
      data: {
        id,
        email,
        role,
        ...(profile?.name ? { name: profile.name } : {}),
        ...(profile?.secondName ? { secondName: profile.secondName } : {}),
        ...(profile?.phone ? { phone: profile.phone } : {}),
        ...(profile?.authProvider ? { authProvider: profile.authProvider } : {}),
      },
      select: userSelect,
    });
  }
}
