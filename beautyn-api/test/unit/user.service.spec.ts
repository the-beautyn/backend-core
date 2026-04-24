import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { UserService, computeProfileCreated } from '../../src/user/user.service';
import { UserRepository } from '../../src/user/user.repository';
import { PhoneVerificationService } from '../../src/auth/phone-verification.service';
import { UserSettingsService } from '../../src/user-settings/user-settings.service';
import { Prisma, UserRole, Users } from '@prisma/client';

const baseUser: Users = {
  id: 'u1',
  email: 'test@example.com',
  role: UserRole.client,
  name: null,
  secondName: null,
  phone: null,
  avatarUrl: null,
  authProvider: 'email',
  isPhoneVerified: false,
  isProfileCreated: false,
  isOnboardingCompleted: false,
  subscriptionId: null,
  crmId: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
};

type UserRepoMock = {
  findById: jest.Mock<Promise<Users | null>, [string]>;
  findByEmail: jest.Mock<Promise<Users | null>, [string]>;
  updateById: jest.Mock<Promise<Users>, [string, Partial<Users>]>;
};

describe('UserService', () => {
  let service: UserService;
  let repo: UserRepoMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: {
            findById: jest.fn(),
            findByEmail: jest.fn(),
            updateById: jest.fn(),
          },
        },
        {
          provide: PhoneVerificationService,
          useValue: { isEnabled: jest.fn().mockReturnValue(true) },
        },
        {
          provide: UserSettingsService,
          useValue: {
            getSettingsIfAny: jest.fn().mockResolvedValue(null),
            hasSettings: jest.fn().mockReturnValue(false),
          },
        },
      ],
    }).compile();

    service = module.get(UserService);
    repo = module.get(UserRepository) as unknown as UserRepoMock;
  });

  it('updateProfile sets is_profile_created=true for client with name+second_name+phone verified', async () => {
    const verifiedUser = { ...baseUser, phone: '+380501234567', isPhoneVerified: true };
    repo.findById.mockResolvedValue(verifiedUser);
    repo.updateById.mockImplementation(
      async (_id: string, data: Partial<Users>): Promise<Users> => ({
        ...verifiedUser,
        name: data.name !== undefined ? data.name : verifiedUser.name,
        secondName: data.secondName !== undefined ? data.secondName : verifiedUser.secondName,
        isProfileCreated:
          data.isProfileCreated !== undefined
            ? data.isProfileCreated
            : verifiedUser.isProfileCreated,
      }),
    );

    const result = await service.updateProfile('u1', {
      name: 'John',
      second_name: 'Doe',
    });

    expect(result.is_profile_created).toBe(true);
  });

  it('owner profile stays incomplete until the phone is verified via OTP', async () => {
    const owner = { ...baseUser, role: UserRole.owner, isPhoneVerified: true };
    repo.findById.mockResolvedValue(owner);

    repo.updateById.mockImplementation(
      async (_id: string, data: Partial<Users>): Promise<Users> => ({
        ...owner,
        name: data.name !== undefined ? data.name : owner.name,
        secondName: data.secondName !== undefined ? data.secondName : owner.secondName,
        phone: data.phone !== undefined ? data.phone : owner.phone,
        isPhoneVerified:
          data.isPhoneVerified !== undefined
            ? data.isPhoneVerified
            : owner.isPhoneVerified,
        isProfileCreated:
          data.isProfileCreated !== undefined
            ? data.isProfileCreated
            : owner.isProfileCreated,
      }),
    );

    // Names alone don't complete an owner profile — a verified phone is required.
    const res1 = await service.updateProfile('u1', {
      name: 'Jane',
      second_name: 'Smith',
    });
    expect(res1.is_profile_created).toBe(false);

    // Supplying a phone on updateProfile does NOT grant verification. The
    // handler resets isPhoneVerified so the user has to re-run OTP; profile
    // stays incomplete until then.
    const res2 = await service.updateProfile('u1', {
      name: 'Jane',
      second_name: 'Smith',
      phone: '+12345678901',
    });
    expect(res2.is_profile_created).toBe(false);
    expect(res2.is_phone_verified).toBe(false);
  });

  it('computeProfileCreated truth table (phone verification enabled)', () => {
    // With phone verification enabled, all roles need name + secondName + phone + isPhoneVerified
    expect(computeProfileCreated(true, 'client', 'a', 'b', '+12345678901', true)).toBe(true);
    expect(computeProfileCreated(true, 'client', 'a', 'b', '+12345678901', false)).toBe(false);
    expect(computeProfileCreated(true, 'client', 'a', 'b')).toBe(false);
    expect(computeProfileCreated(true, 'client', 'a', undefined)).toBe(false);
    expect(computeProfileCreated(true, 'owner', 'a', 'b', '+12345678901', true)).toBe(true);
    expect(computeProfileCreated(true, 'owner', 'a', 'b')).toBe(false);
  });

  it('setOnboardingCompleted flips flag', async () => {
    repo.findById.mockResolvedValue(baseUser);
    repo.updateById.mockResolvedValue({ ...baseUser, isOnboardingCompleted: true });
    const result = await service.setOnboardingCompleted('u1');
    expect(result.is_onboarding_completed).toBe(true);
  });

  it('setPhoneVerified throws ConflictException when phone already verified on another account', async () => {
    repo.findById.mockResolvedValue(baseUser);
    repo.updateById.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['phone'] },
      }),
    );

    await expect(service.setPhoneVerified('u1', '+12345678901')).rejects.toBeInstanceOf(ConflictException);
  });

  it('updateProfile throws ConflictException when phone conflict surfaces on write', async () => {
    const verifiedUser = { ...baseUser, phone: '+380501234567', isPhoneVerified: true };
    repo.findById.mockResolvedValue(verifiedUser);
    repo.updateById.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['phone'] },
      }),
    );

    await expect(
      service.updateProfile('u1', { phone: '+12345678901' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updateProfile clears isPhoneVerified when phone changes', async () => {
    const verifiedUser = { ...baseUser, phone: '+380501111111', isPhoneVerified: true };
    repo.findById.mockResolvedValue(verifiedUser);
    repo.updateById.mockImplementation(async (_id, data) => ({ ...verifiedUser, ...data } as Users));

    await service.updateProfile('u1', { phone: '+380502222222' });

    expect(repo.updateById).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ phone: '+380502222222', isPhoneVerified: false }),
    );
  });

  it('updateProfile leaves isPhoneVerified untouched when phone is not in the DTO', async () => {
    const verifiedUser = { ...baseUser, phone: '+380501111111', isPhoneVerified: true, name: 'Old' };
    repo.findById.mockResolvedValue(verifiedUser);
    repo.updateById.mockImplementation(async (_id, data) => ({ ...verifiedUser, ...data } as Users));

    await service.updateProfile('u1', { name: 'New' });

    const [, writtenData] = repo.updateById.mock.calls[0];
    expect(writtenData).not.toHaveProperty('phone');
    expect(writtenData).not.toHaveProperty('isPhoneVerified');
  });

  it('updateProfile preserves isPhoneVerified when dto phone matches existing', async () => {
    const verifiedUser = { ...baseUser, phone: '+380501111111', isPhoneVerified: true };
    repo.findById.mockResolvedValue(verifiedUser);
    repo.updateById.mockImplementation(async (_id, data) => ({ ...verifiedUser, ...data } as Users));

    await service.updateProfile('u1', { phone: '+380501111111' });

    expect(repo.updateById).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ phone: '+380501111111', isPhoneVerified: true }),
    );
  });
});
