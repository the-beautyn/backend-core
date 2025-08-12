import { Test, TestingModule } from '@nestjs/testing';
import { UserService, computeProfileCreated } from '../user.service';
import { UserRepository } from '../user.repository';
import { UserRole, Users } from '@prisma/client';

const baseUser: Users = {
  id: 'u1',
  email: 'test@example.com',
  role: UserRole.client,
  name: null,
  secondName: null,
  phone: null,
  avatarUrl: null,
  isProfileCreated: false,
  isOnboardingCompleted: false,
  subscriptionId: null,
  crmId: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
};

describe('UserService', () => {
  let service: UserService;
  let repo: jest.Mocked<UserRepository>;

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
    repo = module.get(UserRepository) as jest.Mocked<UserRepository>;
  });

  it('updateProfile sets is_profile_created=true for client with name+second_name', async () => {
    repo.findById.mockResolvedValue({ ...baseUser });
    repo.updateById.mockImplementation(async (_id, data) => ({
      ...baseUser,
      name: data.name!,
      secondName: data.secondName!,
      isProfileCreated: data.isProfileCreated!,
    }));

    const result = await service.updateProfile('u1', {
      name: 'John',
      second_name: 'Doe',
    });

    expect(result.is_profile_created).toBe(true);
  });

  it('owner profile not complete without phone, becomes complete with phone', async () => {
    const owner = { ...baseUser, role: UserRole.owner };
    repo.findById.mockResolvedValue(owner);

    repo.updateById.mockImplementation(async (_id, data) => ({
      ...owner,
      name: data.name ?? owner.name,
      secondName: data.secondName ?? owner.secondName,
      phone: data.phone ?? owner.phone,
      isProfileCreated: data.isProfileCreated!,
    }));

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

  it('computeProfileCreated truth table', () => {
    expect(computeProfileCreated('client', 'a', 'b')).toBe(true);
    expect(computeProfileCreated('client', 'a', undefined)).toBe(false);
    expect(computeProfileCreated('owner', 'a', 'b', '+12345678901')).toBe(true);
    expect(computeProfileCreated('owner', 'a', 'b')).toBe(false);
  });

  it('setOnboardingCompleted flips flag', async () => {
    repo.findById.mockResolvedValue(baseUser);
    repo.updateById.mockResolvedValue({ ...baseUser, isOnboardingCompleted: true });
    const result = await service.setOnboardingCompleted('u1');
    expect(result.is_onboarding_completed).toBe(true);
  });
});
