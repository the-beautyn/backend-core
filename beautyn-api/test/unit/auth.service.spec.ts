import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../src/auth/auth.service';
import { UserService } from '../../src/user/user.service';
import { SupabaseClient } from '@supabase/supabase-js';
import { RegisterDto } from '../../src/auth/dto/v1/register.dto';
import { LoginDto } from '../../src/auth/dto/v1/login.dto';
import { ForgotPasswordDto } from '../../src/auth/dto/v1/forgot-password.dto';
import { ResetPasswordDto } from '../../src/auth/dto/v1/reset-password.dto';
import { UserRole } from '@prisma/client';
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
      updateUser: jest.fn(),
      admin: {
        signOut: jest.fn(),
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

    it('creates a new user with the incoming auth provider', async () => {
      (supabaseClient.auth.signInWithIdToken as unknown as jest.Mock).mockResolvedValue(mockOAuthResponse);
      userService.findByEmail.mockResolvedValue(null);

      const result = await service.oauthSignIn(baseDto);

      expect(userService.createWithId).toHaveBeenCalledWith(
        mockSupabaseUser.id,
        mockSupabaseUser.email,
        'client',
        expect.objectContaining({ authProvider: 'apple' }),
      );
      expect(userService.setAuthProvider).not.toHaveBeenCalled();
      expect(result.is_new_user).toBe(true);
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

    it('should reset password successfully', async () => {
      // Arrange
      const mockVerifyOtpResponse = {
        data: {
          user: mockSupabaseUser,
          session: mockSession,
        },
        error: null,
      };

      const mockUpdateUserResponse = {
        data: { user: mockSupabaseUser },
        error: null,
      };

      (supabaseClient.auth.verifyOtp as unknown as jest.Mock).mockResolvedValue(mockVerifyOtpResponse);
      (supabaseClient.auth.updateUser as unknown as jest.Mock).mockResolvedValue(mockUpdateUserResponse);

      // Act
      const result = await service.resetPassword(resetPasswordDto);

      // Assert
      expect(supabaseClient.auth.verifyOtp).toHaveBeenCalledWith({
        type: 'recovery',
        token_hash: resetPasswordDto.otp_token,
      });
      expect(supabaseClient.auth.updateUser).toHaveBeenCalledWith({
        password: resetPasswordDto.new_password,
      });
      expect(result).toEqual({
        access_token: mockSession.access_token,
        refresh_token: mockSession.refresh_token,
        expires_in: mockSession.expires_in,
      });
    });

    it('should throw BadRequestException when OTP verification fails', async () => {
      // Arrange
      const mockError = { message: 'Invalid OTP token' };
      const mockVerifyOtpResponse = {
        data: { user: null, session: null },
        error: mockError,
      };

      (supabaseClient.auth.verifyOtp as unknown as jest.Mock).mockResolvedValue(mockVerifyOtpResponse);

      // Act & Assert
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        new BadRequestException(mockError.message),
      );
      expect(supabaseClient.auth.updateUser).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when password update fails', async () => {
      // Arrange
      const mockVerifyOtpResponse = {
        data: {
          user: mockSupabaseUser,
          session: mockSession,
        },
        error: null,
      };

      const mockUpdateError = { message: 'Password update failed' };
      const mockUpdateUserResponse = {
        data: { user: null },
        error: mockUpdateError,
      };

      (supabaseClient.auth.verifyOtp as unknown as jest.Mock).mockResolvedValue(mockVerifyOtpResponse);
      (supabaseClient.auth.updateUser as unknown as jest.Mock).mockResolvedValue(mockUpdateUserResponse);

      // Act & Assert
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        new BadRequestException(mockUpdateError.message),
      );
    });
  });
});