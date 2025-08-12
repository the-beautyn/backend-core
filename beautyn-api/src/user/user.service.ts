import {
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { UserRepository } from './user.repository';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { NotificationUserDto } from './dto/notification-user.dto';
import { Users, UserRole } from '@prisma/client';

export function computeProfileCreated(
  role: 'client' | 'owner' | 'admin',
  name?: string | null,
  second_name?: string | null,
  phone?: string | null,
) {
  const hasNames = !!name && !!second_name;
  return role === 'owner' ? hasNames && !!phone : hasNames;
}

@Injectable()
export class UserService {
  constructor(private readonly repo: UserRepository) {}

  private toResponse(user: Users): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name ?? null,
      second_name: user.secondName ?? null,
      phone: user.phone ?? null,
      avatar_url: user.avatarUrl ?? null,
      is_profile_created: user.isProfileCreated,
      is_onboarding_completed: user.isOnboardingCompleted,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  }

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.repo.findById(id);
    if (!user) {
      throw new NotFoundException(`User not found with ID: ${id}`);
    }
    return this.toResponse(user);
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

    const isProfileCreated = computeProfileCreated(
      existing.role,
      name,
      secondName,
      phone,
    );

    const data: Partial<Users> = {
      ...(dto.name !== undefined ? { name } : {}),
      ...(dto.second_name !== undefined ? { secondName } : {}),
      ...(dto.phone !== undefined ? { phone } : {}),
      ...(dto.avatar_url !== undefined ? { avatarUrl } : {}),
      isProfileCreated,
    };

    const updated = await this.repo.updateById(id, data);
    return this.toResponse(updated);
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

  async isProfileComplete(id: string): Promise<boolean> {
    const user = await this.repo.findById(id);
    return !!user?.isProfileCreated;
  }

  // Auth-related methods (migrated from users module)
  findByEmail(email: string) {
    return this.repo.findByEmail(email);
  }

  createWithId(id: string, email: string, role: UserRole) {
    return this.repo.createWithId(id, email, role);
  }
}
