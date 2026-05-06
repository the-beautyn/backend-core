import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ClientSettingsService } from '../client-settings/client-settings.service';
import { ClientSettingsResponseDto } from '../client-settings/dto/client-settings-response.dto';
import { OwnerSettingsService } from '../owner-settings/owner-settings.service';
import { OwnerSettingsResponseDto } from '../owner-settings/dto/owner-settings-response.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';

export type RoleSettingsResponse = ClientSettingsResponseDto | OwnerSettingsResponseDto;

@Injectable()
export class UserSettingsService {
  constructor(
    private readonly clientSettings: ClientSettingsService,
    private readonly ownerSettings: OwnerSettingsService,
  ) {}

  hasSettings(role: UserRole): boolean {
    return role === UserRole.client || role === UserRole.owner;
  }

  async getSettings(userId: string, role: UserRole): Promise<RoleSettingsResponse> {
    if (role === UserRole.client) return this.clientSettings.getSettings(userId);
    if (role === UserRole.owner) return this.ownerSettings.getSettings(userId);
    throw new ForbiddenException('This role does not have settings');
  }

  async getSettingsIfAny(userId: string, role: UserRole): Promise<RoleSettingsResponse | null> {
    return this.hasSettings(role) ? this.getSettings(userId, role) : null;
  }

  async updateNotifications(
    userId: string,
    role: UserRole,
    dto: UpdateNotificationSettingsDto,
  ): Promise<RoleSettingsResponse> {
    if (role === UserRole.client) {
      if (dto.in_app_enabled !== undefined) {
        throw new BadRequestException('in_app_enabled is not applicable to client role');
      }
      return this.clientSettings.updateNotifications(userId, {
        push_enabled: dto.push_enabled,
        email_enabled: dto.email_enabled,
        sms_enabled: dto.sms_enabled,
      });
    }
    if (role === UserRole.owner) {
      if (dto.push_enabled !== undefined) {
        throw new BadRequestException('push_enabled is not applicable to owner role');
      }
      return this.ownerSettings.updateNotifications(userId, {
        in_app_enabled: dto.in_app_enabled,
        email_enabled: dto.email_enabled,
        sms_enabled: dto.sms_enabled,
      });
    }
    throw new ForbiddenException('This role does not have notification settings');
  }
}
