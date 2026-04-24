import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UserSettingsService } from '../../src/user-settings/user-settings.service';
import { ClientSettingsService } from '../../src/client-settings/client-settings.service';
import { OwnerSettingsService } from '../../src/owner-settings/owner-settings.service';

describe('UserSettingsService (facade)', () => {
  let service: UserSettingsService;
  let client: { getSettings: jest.Mock; updateNotifications: jest.Mock };
  let owner: { getSettings: jest.Mock; updateNotifications: jest.Mock };

  beforeEach(async () => {
    client = {
      getSettings: jest.fn().mockResolvedValue({
        notifications: { push_enabled: true, email_enabled: true, sms_enabled: true },
      }),
      updateNotifications: jest.fn().mockResolvedValue({
        notifications: { push_enabled: false, email_enabled: true, sms_enabled: true },
      }),
    };
    owner = {
      getSettings: jest.fn().mockResolvedValue({
        notifications: { in_app_enabled: true, email_enabled: true, sms_enabled: true },
      }),
      updateNotifications: jest.fn().mockResolvedValue({
        notifications: { in_app_enabled: false, email_enabled: true, sms_enabled: true },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserSettingsService,
        { provide: ClientSettingsService, useValue: client },
        { provide: OwnerSettingsService, useValue: owner },
      ],
    }).compile();

    service = module.get(UserSettingsService);
  });

  it('hasSettings is true for client and owner, false for admin', () => {
    expect(service.hasSettings(UserRole.client)).toBe(true);
    expect(service.hasSettings(UserRole.owner)).toBe(true);
    expect(service.hasSettings(UserRole.admin)).toBe(false);
  });

  it('getSettings dispatches to ClientSettingsService for client role', async () => {
    const result = await service.getSettings('u1', UserRole.client);
    expect(client.getSettings).toHaveBeenCalledWith('u1');
    expect(owner.getSettings).not.toHaveBeenCalled();
    expect(result).toHaveProperty('notifications.push_enabled');
  });

  it('getSettings dispatches to OwnerSettingsService for owner role', async () => {
    const result = await service.getSettings('u1', UserRole.owner);
    expect(owner.getSettings).toHaveBeenCalledWith('u1');
    expect(client.getSettings).not.toHaveBeenCalled();
    expect(result).toHaveProperty('notifications.in_app_enabled');
  });

  it('getSettings throws ForbiddenException for admin', async () => {
    await expect(service.getSettings('u1', UserRole.admin)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('getSettingsIfAny returns null for admin instead of throwing', async () => {
    const res = await service.getSettingsIfAny('u1', UserRole.admin);
    expect(res).toBeNull();
  });

  it('updateNotifications rejects in_app_enabled from a client', async () => {
    await expect(
      service.updateNotifications('u1', UserRole.client, { in_app_enabled: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(client.updateNotifications).not.toHaveBeenCalled();
  });

  it('updateNotifications rejects push_enabled from an owner', async () => {
    await expect(
      service.updateNotifications('u1', UserRole.owner, { push_enabled: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(owner.updateNotifications).not.toHaveBeenCalled();
  });

  it('updateNotifications forwards only role-relevant fields to the client service', async () => {
    await service.updateNotifications('u1', UserRole.client, {
      push_enabled: false,
      email_enabled: true,
      sms_enabled: false,
    });
    expect(client.updateNotifications).toHaveBeenCalledWith('u1', {
      push_enabled: false,
      email_enabled: true,
      sms_enabled: false,
    });
  });

  it('updateNotifications forwards only role-relevant fields to the owner service', async () => {
    await service.updateNotifications('u1', UserRole.owner, {
      in_app_enabled: false,
      email_enabled: true,
      sms_enabled: false,
    });
    expect(owner.updateNotifications).toHaveBeenCalledWith('u1', {
      in_app_enabled: false,
      email_enabled: true,
      sms_enabled: false,
    });
  });

  it('updateNotifications throws ForbiddenException for admin', async () => {
    await expect(
      service.updateNotifications('u1', UserRole.admin, { email_enabled: true }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
