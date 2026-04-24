import {
  ConflictException,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { UserRepository } from './user.repository';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { NotificationUserDto } from './dto/notification-user.dto';
import { Prisma, Users, UserRole, AuthProvider } from '@prisma/client';
import { PhoneVerificationService } from '../auth/phone-verification.service';
import { UserSettingsService } from '../user-settings/user-settings.service';

const PHONE_CONFLICT_MESSAGE = 'Phone number is already in use';

function isVerifiedPhoneConflict(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (err.code !== 'P2002') return false;
  const target = (err.meta as { target?: string | string[] } | undefined)?.target;
  const targets = Array.isArray(target) ? target : target ? [target] : [];
  return targets.includes('phone');
}

export function computeProfileCreated(
  phoneVerificationEnabled: boolean,
  role: 'client' | 'owner' | 'admin',
  name?: string | null,
  second_name?: string | null,
  phone?: string | null,
  isPhoneVerified?: boolean,
) {
  const hasNames = !!name && !!second_name;
  if (phoneVerificationEnabled) {
    return hasNames && !!phone && !!isPhoneVerified;
  }
  return role === 'owner' ? hasNames && !!phone : hasNames;
}

@Injectable()
export class UserService {
  constructor(
    private readonly repo: UserRepository,
    private readonly phoneVerification: PhoneVerificationService,
    private readonly userSettings: UserSettingsService,
  ) {}

  private toResponse(user: Users): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name ?? null,
      second_name: user.secondName ?? null,
      phone: user.phone ?? null,
      avatar_url: user.avatarUrl ?? null,
      auth_provider: user.authProvider,
      is_phone_verified: user.isPhoneVerified,
      is_profile_created: user.isProfileCreated,
      is_onboarding_completed: user.isOnboardingCompleted,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  }

  async findById(
    id: string,
    opts?: { includeSettings?: boolean },
  ): Promise<UserResponseDto> {
    const user = await this.repo.findById(id);
    if (!user) {
      throw new NotFoundException(`User not found with ID: ${id}`);
    }
    const response = this.toResponse(user);
    if (opts?.includeSettings) {
      response.settings = await this.userSettings.getSettingsIfAny(user.id, user.role);
    }
    return response;
  }

  async updateProfile(
    id: string,
    dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const name = dto.name?.trim() ?? existing.name ?? null;
    const secondName = dto.second_name?.trim() ?? existing.secondName ?? null;
    const phone = dto.phone?.trim() ?? existing.phone ?? null;
    const avatarUrl = dto.avatar_url?.trim() ?? existing.avatarUrl ?? null;

    // If the user changes their phone number, any prior verification no
    // longer applies — they must re-run OTP against the new number.
    // Otherwise a verified user could swap to an unverified number and
    // stay flagged as trusted.
    const phoneChanged = dto.phone !== undefined && phone !== existing.phone;
    const isPhoneVerified = phoneChanged ? false : existing.isPhoneVerified;

    const isProfileCreated = computeProfileCreated(
      this.phoneVerification.isEnabled(),
      existing.role,
      name,
      secondName,
      phone,
      isPhoneVerified,
    );

    const data: Partial<Users> = {
      ...(dto.name !== undefined ? { name } : {}),
      ...(dto.second_name !== undefined ? { secondName } : {}),
      ...(dto.phone !== undefined ? { phone, isPhoneVerified } : {}),
      ...(dto.avatar_url !== undefined ? { avatarUrl } : {}),
      isProfileCreated,
    };

    try {
      const updated = await this.repo.updateById(id, data);
      return this.toResponse(updated);
    } catch (err) {
      if (isVerifiedPhoneConflict(err)) throw new ConflictException(PHONE_CONFLICT_MESSAGE);
      throw err;
    }
  }

  async findContactInfo(id: string): Promise<NotificationUserDto> {
    const user = await this.repo.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      second_name: user.secondName ?? null,
      phone: user.phone ?? null,
    };
  }

  async setOnboardingCompleted(id: string): Promise<UserResponseDto> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException('User not found');
    }
    const updated = await this.repo.updateById(id, {
      isOnboardingCompleted: true,
    });
    return this.toResponse(updated);
  }

  async setPhoneVerified(id: string, phone: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('User not found');

    const isProfileCreated = computeProfileCreated(
      this.phoneVerification.isEnabled(),
      existing.role,
      existing.name,
      existing.secondName,
      phone,
      true,
    );

    try {
      await this.repo.updateById(id, { phone, isPhoneVerified: true, isProfileCreated });
    } catch (err) {
      if (isVerifiedPhoneConflict(err)) throw new ConflictException(PHONE_CONFLICT_MESSAGE);
      throw err;
    }
  }

  async isProfileComplete(id: string): Promise<boolean> {
    const user = await this.repo.findById(id);
    return !!user?.isProfileCreated;
  }

  // Auth-related methods (migrated from users module)
  findByEmail(email: string) {
    return this.repo.findByEmail(email);
  }

  createWithId(
    id: string,
    email: string,
    role: UserRole,
    profile?: { name?: string; secondName?: string; phone?: string; authProvider?: AuthProvider },
  ) {
    return this.repo.createWithId(id, email, role, profile);
  }

  async setAuthProvider(id: string, authProvider: AuthProvider): Promise<void> {
    await this.repo.updateById(id, { authProvider });
  }
}
