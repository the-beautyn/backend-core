import { Injectable } from '@nestjs/common';
import { OwnerSettings } from '@prisma/client';
import { OwnerSettingsRepository } from './owner-settings.repository';
import { OwnerSettingsResponseDto } from './dto/owner-settings-response.dto';

export interface OwnerNotificationPatch {
  in_app_enabled?: boolean;
  email_enabled?: boolean;
  sms_enabled?: boolean;
}

@Injectable()
export class OwnerSettingsService {
  constructor(private readonly repo: OwnerSettingsRepository) {}

  private toResponse(row: OwnerSettings): OwnerSettingsResponseDto {
    return {
      notifications: {
        in_app_enabled: row.inAppNotificationsEnabled,
        email_enabled: row.emailNotificationsEnabled,
        sms_enabled: row.smsNotificationsEnabled,
      },
    };
  }

  async getSettings(userId: string): Promise<OwnerSettingsResponseDto> {
    const existing = await this.repo.findByUserId(userId);
    if (existing) return this.toResponse(existing);
    const created = await this.repo.upsertByUserId(userId, {});
    return this.toResponse(created);
  }

  async updateNotifications(
    userId: string,
    patch: OwnerNotificationPatch,
  ): Promise<OwnerSettingsResponseDto> {
    const data: Partial<OwnerSettings> = {
      ...(patch.in_app_enabled !== undefined
        ? { inAppNotificationsEnabled: patch.in_app_enabled }
        : {}),
      ...(patch.email_enabled !== undefined
        ? { emailNotificationsEnabled: patch.email_enabled }
        : {}),
      ...(patch.sms_enabled !== undefined
        ? { smsNotificationsEnabled: patch.sms_enabled }
        : {}),
    };
    const updated = await this.repo.upsertByUserId(userId, data);
    return this.toResponse(updated);
  }
}
