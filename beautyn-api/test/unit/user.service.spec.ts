import { Test, TestingModule } from '@nestjs/testing';
import { UserService, computeProfileCreated } from '../../src/user/user.service';
import { UserRepository } from '../../src/user/user.repository';
import { UserRole, Users } from '@prisma/client';

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

  it('owner profile not complete without verified phone, becomes complete with verified phone', async () => {
    const owner = { ...baseUser, role: UserRole.owner, isPhoneVerified: true };
    repo.findById.mockResolvedValue(owner);

    repo.updateById.mockImplementation(
      async (_id: string, data: Partial<Users>): Promise<Users> => ({
        ...owner,
        name: data.name !== undefined ? data.name : owner.name,
        secondName: data.secondName !== undefined ? data.secondName : owner.secondName,
        phone: data.phone !== undefined ? data.phone : owner.phone,
        isProfileCreated:
          data.isProfileCreated !== undefined
            ? data.isProfileCreated
            : owner.isProfileCreated,
      }),
    );

    const res1 = await service.updateProfile('u1', {
      name: 'Jane',
      second_name: 'Smith',
    });
    expect(res1.is_profile_created).toBe(false);

    const res2 = await service.updateProfile('u1', {
      name: 'Jane',
      second_name: 'Smith',
      phone: '+12345678901',
    });
    expect(res2.is_profile_created).toBe(true);
  });

  it('computeProfileCreated truth table (phone verification enabled)', () => {
    // With phone verification enabled (default), all roles need name + secondName + phone + isPhoneVerified
    expect(computeProfileCreated('client', 'a', 'b', '+12345678901', true)).toBe(true);
    expect(computeProfileCreated('client', 'a', 'b', '+12345678901', false)).toBe(false);
    expect(computeProfileCreated('client', 'a', 'b')).toBe(false);
    expect(computeProfileCreated('client', 'a', undefined)).toBe(false);
    expect(computeProfileCreated('owner', 'a', 'b', '+12345678901', true)).toBe(true);
    expect(computeProfileCreated('owner', 'a', 'b')).toBe(false);
  });

  it('setOnboardingCompleted flips flag', async () => {
    repo.findById.mockResolvedValue(baseUser);
    repo.updateById.mockResolvedValue({ ...baseUser, isOnboardingCompleted: true });
    const result = await service.setOnboardingCompleted('u1');
    expect(result.is_onboarding_completed).toBe(true);
  });
});
