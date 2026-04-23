import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../src/auth/auth.service';
import { UserService } from '../../src/user/user.service';
import { SupabaseClient } from '@supabase/supabase-js';
import { RegisterDto } from '../../src/auth/dto/v1/register.dto';
import { LoginDto } from '../../src/auth/dto/v1/login.dto';
import { ForgotPasswordDto } from '../../src/auth/dto/v1/forgot-password.dto';
import { ResetPasswordDto } from '../../src/auth/dto/v1/reset-password.dto';
import { Prisma, UserRole } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PhoneVerificationService } from '../../src/auth/phone-verification.service';

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let supabaseClient: jest.Mocked<SupabaseClient>;

  // Mock data
  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    role: UserRole.client,
    name: null,
    secondName: null,
    phone: null,
    avatarUrl: null,
    authProvider: 'email' as const,
    isPhoneVerified: false,
    isProfileCreated: false,
    isOnboardingCompleted: false,
    subscriptionId: null,
    crmId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    subscriptionPlan: null,
  };

  const mockSupabaseUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  const mockSession = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: mockSupabaseUser,
  };

  beforeEach(async () => {
    const mockUserService = {
      create: jest.fn(),
      createWithId: jest.fn(),
      findByEmail: jest.fn(),
      setAuthProvider: jest.fn(),
    };

    const mockSupabaseAuth = {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signInWithIdToken: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      verifyOtp: jest.fn(),
      admin: {
        signOut: jest.fn(),
        updateUserById: jest.fn(),
      },
    };

    const mockSupabaseClient = {
      auth: mockSupabaseAuth,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: SupabaseClient,
          useValue: mockSupabaseClient,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, fallback?: string) => {
              if (key === 'APP_URL') return 'https://test.beautyn.com.ua';
              return fallback ?? 'true';
            }),
          },
        },
        {
          provide: PhoneVerificationService,
          useValue: { isEnabled: jest.fn().mockReturnValue(true) },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    supabaseClient = module.get(SupabaseClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      password: 'Password123!',
      role: UserRole.client,
      name: 'John',
      secondName: 'Doe',
    };

    it('should register a new user successfully with session', async () => {
      // Arrange
      const mockSignUpResponse = {
        data: {
          user: mockSupabaseUser,
          session: mockSession,
        },
        error: null,
      };

      (supabaseClient.auth.signUp as unknown as jest.Mock).mockResolvedValue(mockSignUpResponse);
      userService.createWithId.mockResolvedValue(mockUser);

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(supabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: registerDto.email,
        password: registerDto.password,
        options: { data: { user_role: registerDto.role } },
      });
      expect(userService.createWithId).toHaveBeenCalledWith(
        mockSupabaseUser.id, registerDto.email, registerDto.role,
        { name: 'John', secondName: 'Doe', authProvider: 'email' },
      );
      expect(result).toEqual({
        access_token: mockSession.access_token,
        refresh_token: mockSession.refresh_token,
        expires_in: mockSession.expires_in,
        phone_verification_required: true,
      });
    });

    it('should return confirmation message when email confirmation is required', async () => {
      // Arrange
      const mockSignUpResponse = {
        data: {
          user: mockSupabaseUser,
          session: null, // No session means email confirmation required
        },
        error: null,
      };

      (supabaseClient.auth.signUp as unknown as jest.Mock).mockResolvedValue(mockSignUpResponse);

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(supabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: registerDto.email,
        password: registerDto.password,
        options: { data: { user_role: registerDto.role } },
      });
      expect(userService.createWithId).not.toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Check your inbox to confirm registration',
      });
    });

    it('should throw BadRequestException when Supabase returns error', async () => {
      // Arrange
      const mockError = { message: 'Email already exists' };
      const mockSignUpResponse = {
        data: { user: null, session: null },
        error: mockError,
      };

      (supabaseClient.auth.signUp as unknown as jest.Mock).mockResolvedValue(mockSignUpResponse);

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(
        new BadRequestException(mockError.message),
      );
      expect(userService.createWithId).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should login user successfully', async () => {
      // Arrange
      const mockSignInResponse = {
        data: {
          user: mockSupabaseUser,
          session: mockSession,
        },
        error: null,
      };

      (supabaseClient.auth.signInWithPassword as unknown as jest.Mock).mockResolvedValue(mockSignInResponse);

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(supabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: loginDto.email,
        password: loginDto.password,
      });
      expect(result).toEqual({
        access_token: mockSession.access_token,
        refresh_token: mockSession.refresh_token,
        expires_in: mockSession.expires_in,
        phone_verification_required: true,
      });
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      // Arrange
      const mockError = { message: 'Invalid credentials' };
      const mockSignInResponse = {
        data: { user: null, session: null },
        error: mockError,
      };

      (supabaseClient.auth.signInWithPassword as unknown as jest.Mock).mockResolvedValue(mockSignInResponse);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException(mockError.message),
      );
    });
  });

  describe('oauthSignIn', () => {
    const baseDto = {
      provider: 'apple' as const,
      idToken: 'id-token',
      name: 'Jane',
      secondName: 'Doe',
    };

    const mockOAuthResponse = {
      data: { user: mockSupabaseUser, session: mockSession },
      error: null,
    };

    it('creates a new user and mirrors the role into Supabase user_metadata', async () => {
      (supabaseClient.auth.signInWithIdToken as unknown as jest.Mock).mockResolvedValue(mockOAuthResponse);
      userService.findByEmail.mockResolvedValue(null);
      (supabaseClient.auth.admin.updateUserById as unknown as jest.Mock).mockResolvedValue({ error: null });

      const result = await service.oauthSignIn(baseDto);

      expect(userService.createWithId).toHaveBeenCalledWith(
        mockSupabaseUser.id,
        mockSupabaseUser.email,
        'client',
        expect.objectContaining({ authProvider: 'apple' }),
      );
      // Without this mirror, subsequent requests for this user would 403 on
      // any ClientRolesGuard/OwnerRolesGuard-protected endpoint because
      // JwtAuthGuard reads role from user_metadata.user_role.
      expect(supabaseClient.auth.admin.updateUserById).toHaveBeenCalledWith(
        mockSupabaseUser.id,
        { user_metadata: { user_role: 'client' } },
      );
      expect(userService.setAuthProvider).not.toHaveBeenCalled();
      expect(result.is_new_user).toBe(true);
    });

    it('surfaces a Supabase error if the user_metadata mirror fails after user creation', async () => {
      (supabaseClient.auth.signInWithIdToken as unknown as jest.Mock).mockResolvedValue(mockOAuthResponse);
      userService.findByEmail.mockResolvedValue(null);
      const metadataError = { message: 'Supabase admin update failed' };
      (supabaseClient.auth.admin.updateUserById as unknown as jest.Mock).mockResolvedValue({ error: metadataError });

      await expect(service.oauthSignIn(baseDto)).rejects.toThrow(
        new BadRequestException(metadataError.message),
      );
    });

    it('updates authProvider when an existing user signs in via a different provider', async () => {
      (supabaseClient.auth.signInWithIdToken as unknown as jest.Mock).mockResolvedValue(mockOAuthResponse);
      userService.findByEmail.mockResolvedValue({ ...mockUser, authProvider: 'email' });

      const result = await service.oauthSignIn(baseDto);

      expect(userService.createWithId).not.toHaveBeenCalled();
      expect(userService.setAuthProvider).toHaveBeenCalledWith(mockUser.id, 'apple');
      expect(result.is_new_user).toBe(false);
    });

    it('leaves authProvider untouched when it already matches the incoming provider', async () => {
      (supabaseClient.auth.signInWithIdToken as unknown as jest.Mock).mockResolvedValue(mockOAuthResponse);
      userService.findByEmail.mockResolvedValue({ ...mockUser, authProvider: 'apple' });

      await service.oauthSignIn(baseDto);

      expect(userService.createWithId).not.toHaveBeenCalled();
      expect(userService.setAuthProvider).not.toHaveBeenCalled();
    });

    it('rejects with 409 when the OAuth user ID differs from the stored user ID', async () => {
      // Supabase did NOT link identities — OAuth produced a new Supabase user
      // whose ID doesn't match the email/password user we have on record.
      // Returning this session's JWT would break all subsequent authenticated
      // requests (sub won't match any DB row).
      (supabaseClient.auth.signInWithIdToken as unknown as jest.Mock).mockResolvedValue(mockOAuthResponse);
      userService.findByEmail.mockResolvedValue({
        ...mockUser,
        id: 'different-db-user-id',
        authProvider: 'email',
      });

      await expect(service.oauthSignIn(baseDto)).rejects.toBeInstanceOf(ConflictException);
      expect(userService.createWithId).not.toHaveBeenCalled();
      expect(userService.setAuthProvider).not.toHaveBeenCalled();
    });

    it('recovers from a P2002 race: two concurrent first-time OAuth sign-ins', async () => {
      // Simulates: findByEmail returns null (row not yet committed by the
      // other request), createWithId races and fails with P2002, re-fetch
      // now returns the winner's row, and we finish as !is_new_user.
      (supabaseClient.auth.signInWithIdToken as unknown as jest.Mock).mockResolvedValue(mockOAuthResponse);
      userService.findByEmail
        .mockResolvedValueOnce(null) // initial check
        .mockResolvedValueOnce({ ...mockUser, authProvider: 'apple' }); // re-fetch after P2002
      userService.createWithId.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
          meta: { target: ['email'] },
        }),
      );

      const result = await service.oauthSignIn(baseDto);

      expect(userService.createWithId).toHaveBeenCalledTimes(1);
      expect(userService.findByEmail).toHaveBeenCalledTimes(2);
      // Winner already had authProvider='apple' matching incoming provider —
      // no update needed.
      expect(userService.setAuthProvider).not.toHaveBeenCalled();
      expect(result.is_new_user).toBe(false);
    });

    it('propagates non-P2002 errors from createWithId untouched', async () => {
      (supabaseClient.auth.signInWithIdToken as unknown as jest.Mock).mockResolvedValue(mockOAuthResponse);
      userService.findByEmail.mockResolvedValue(null);
      const unexpected = new Error('DB connection refused');
      userService.createWithId.mockRejectedValue(unexpected);

      await expect(service.oauthSignIn(baseDto)).rejects.toBe(unexpected);
    });
  });

  describe('logout', () => {
    const accessToken = 'mock-access-token';

    it('revokes the user\'s refresh tokens via admin.signOut', async () => {
      (supabaseClient.auth.admin.signOut as unknown as jest.Mock).mockResolvedValue({ error: null });

      const result = await service.logout(accessToken);

      expect(supabaseClient.auth.admin.signOut).toHaveBeenCalledWith(accessToken);
      expect(result).toEqual({ message: 'Logged out' });
    });

    it('throws BadRequestException when admin.signOut fails', async () => {
      const mockError = { message: 'Logout failed' };
      (supabaseClient.auth.admin.signOut as unknown as jest.Mock).mockResolvedValue({ error: mockError });

      await expect(service.logout(accessToken)).rejects.toThrow(
        new BadRequestException(mockError.message),
      );
    });
  });

  describe('forgotPassword', () => {
    const forgotPasswordDto: ForgotPasswordDto = {
      email: 'test@example.com',
    };

    it('should send password reset email successfully', async () => {
      // Arrange
      const mockResetResponse = {
        error: null,
      };

      (supabaseClient.auth.resetPasswordForEmail as unknown as jest.Mock).mockResolvedValue(mockResetResponse);

      // Act
      const result = await service.forgotPassword(forgotPasswordDto);

      // Assert
      expect(supabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        forgotPasswordDto.email,
        {
          redirectTo: 'https://test.beautyn.com.ua/auth/reset',
        },
      );
      expect(result).toEqual({
        message: 'Password-reset email sent',
      });
    });

    it('should throw BadRequestException when reset email fails', async () => {
      // Arrange
      const mockError = { message: 'Email not found' };
      const mockResetResponse = {
        error: mockError,
      };

      (supabaseClient.auth.resetPasswordForEmail as unknown as jest.Mock).mockResolvedValue(mockResetResponse);

      // Act & Assert
      await expect(service.forgotPassword(forgotPasswordDto)).rejects.toThrow(
        new BadRequestException(mockError.message),
      );
    });
  });

  describe('resetPassword', () => {
    const resetPasswordDto: ResetPasswordDto = {
      otp_token: 'mock-otp-token',
      new_password: 'NewPassword123!',
    };

    it('routes the update through admin.updateUserById, scoped by user id', async () => {
      const mockVerifyOtpResponse = {
        data: { user: mockSupabaseUser, session: mockSession },
        error: null,
      };
      const freshSession = {
        access_token: 'fresh-access-token',
        refresh_token: 'fresh-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
        user: mockSupabaseUser,
      };
      (supabaseClient.auth.verifyOtp as unknown as jest.Mock).mockResolvedValue(mockVerifyOtpResponse);
      (supabaseClient.auth.admin.updateUserById as unknown as jest.Mock).mockResolvedValue({
        data: { user: mockSupabaseUser },
        error: null,
      });
      (supabaseClient.auth.signInWithPassword as unknown as jest.Mock).mockResolvedValue({
        data: { user: mockSupabaseUser, session: freshSession },
        error: null,
      });

      const result = await service.resetPassword(resetPasswordDto);

      expect(supabaseClient.auth.verifyOtp).toHaveBeenCalledWith({
        type: 'recovery',
        token_hash: resetPasswordDto.otp_token,
      });
      // Critical: must pass user id explicitly, NOT fall back to the shared
      // client's session state (which is racy under concurrent requests).
      expect(supabaseClient.auth.admin.updateUserById).toHaveBeenCalledWith(
        mockSupabaseUser.id,
        { password: resetPasswordDto.new_password },
      );
      // Supabase revokes the recovery session once the password changes, so
      // we must mint fresh tokens via signInWithPassword before returning.
      expect(supabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: mockSupabaseUser.email,
        password: resetPasswordDto.new_password,
      });
      expect(result).toEqual({
        access_token: freshSession.access_token,
        refresh_token: freshSession.refresh_token,
        expires_in: freshSession.expires_in,
      });
    });

    it('throws BadRequestException when OTP verification fails', async () => {
      const mockError = { message: 'Invalid OTP token' };
      (supabaseClient.auth.verifyOtp as unknown as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        new BadRequestException(mockError.message),
      );
      expect(supabaseClient.auth.admin.updateUserById).not.toHaveBeenCalled();
    });

    it('throws when verifyOtp succeeds but returns no user (guards the admin call)', async () => {
      (supabaseClient.auth.verifyOtp as unknown as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(BadRequestException);
      expect(supabaseClient.auth.admin.updateUserById).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when admin.updateUserById fails', async () => {
      (supabaseClient.auth.verifyOtp as unknown as jest.Mock).mockResolvedValue({
        data: { user: mockSupabaseUser, session: mockSession },
        error: null,
      });
      const mockUpdateError = { message: 'Password update failed' };
      (supabaseClient.auth.admin.updateUserById as unknown as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: mockUpdateError,
      });

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        new BadRequestException(mockUpdateError.message),
      );
    });
  });
});