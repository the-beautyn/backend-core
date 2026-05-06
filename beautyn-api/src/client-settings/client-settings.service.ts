import { Injectable } from '@nestjs/common';
import { ClientSettings } from '@prisma/client';
import { ClientSettingsRepository } from './client-settings.repository';
import { ClientSettingsResponseDto } from './dto/client-settings-response.dto';

export interface ClientNotificationPatch {
  push_enabled?: boolean;
  email_enabled?: boolean;
  sms_enabled?: boolean;
}

@Injectable()
export class ClientSettingsService {
  constructor(private readonly repo: ClientSettingsRepository) {}

  private toResponse(row: ClientSettings): ClientSettingsResponseDto {
    return {
      notifications: {
        push_enabled: row.pushNotificationsEnabled,
        email_enabled: row.emailNotificationsEnabled,
        sms_enabled: row.smsNotificationsEnabled,
      },
    };
  }

  async getSettings(userId: string): Promise<ClientSettingsResponseDto> {
    const existing = await this.repo.findByUserId(userId);
    if (existing) return this.toResponse(existing);
    const created = await this.repo.upsertByUserId(userId, {});
    return this.toResponse(created);
  }

  async updateNotifications(
    userId: string,
    patch: ClientNotificationPatch,
  ): Promise<ClientSettingsResponseDto> {
    const data: Partial<ClientSettings> = {
      ...(patch.push_enabled !== undefined
        ? { pushNotificationsEnabled: patch.push_enabled }
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
