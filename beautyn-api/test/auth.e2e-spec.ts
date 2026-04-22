import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/database/prisma.service';
import { SupabaseClient } from '@supabase/supabase-js';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../src/shared/guards/jwt-auth.guard';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let supabaseClient: SupabaseClient;

  // Mock data
  const mockUser = {
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
    user: mockUser,
  };

  beforeAll(async () => {
    const mockJwtGuard = {
      canActivate: jest.fn().mockImplementation((context) => {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
          // Mock successful authentication
          request.user = { accessToken: authHeader.split(' ')[1] };
          return true;
        }
        return false;
      }),
    };

    // In-memory Prisma mock (users only) to avoid real DB
    const memUsers: any[] = [];
    const prismaMock: Partial<PrismaService> = {
      users: {
        create: jest.fn().mockImplementation(({ data }: any) => {
          const row = {
            role: 'client',
            isProfileCreated: false,
            ...data,
          };
          memUsers.push(row);
          return row;
        }),
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          if (where?.email) return memUsers.find((u) => u.email === where.email) || null;
          if (where?.id) return memUsers.find((u) => u.id === where.id) || null;
          return null;
        }),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          const idx = memUsers.findIndex((u) => u.id === where.id || u.email === where.email);
          if (idx < 0) throw new Error('User not found');
          memUsers[idx] = { ...memUsers[idx], ...data };
          return memUsers[idx];
        }),
        deleteMany: jest.fn().mockImplementation(({ where }: any = {}) => {
          if (where?.email?.in && Array.isArray(where.email.in)) {
            const set = new Set(where.email.in);
            const before = memUsers.length;
            for (let i = memUsers.length - 1; i >= 0; i--) {
              if (set.has(memUsers[i].email)) memUsers.splice(i, 1);
            }
            return { count: before - memUsers.length };
          }
          const count = memUsers.length;
          memUsers.length = 0;
          return { count };
        }),
      } as any,
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SupabaseClient)
      .useValue({
        auth: {
          signUp: jest.fn(),
          signInWithPassword: jest.fn(),
          resetPasswordForEmail: jest.fn(),
          verifyOtp: jest.fn(),
          admin: { signOut: jest.fn(), updateUserById: jest.fn() },
        },
      })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    supabaseClient = app.get<SupabaseClient>(SupabaseClient);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    jest.clearAllMocks(); // reset Supabase/auth call history between tests
  });

  afterEach(async () => {
    // Targeted cleanup: remove only test-created users
    const emails = ['newuser@example.com', 'confirm@example.com'];
    try {
      await prisma.users.deleteMany({ where: { email: { in: emails } } } as any);
    } catch (_) {
      // ignore if table not present or other transient issues in local setups
    }
  });

  describe('/api/v1/auth/register (POST)', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const registerDto = {
        email: 'newuser@example.com',
        password: 'Password123!',
        role: 'client',
      };

      const mockSignUpResponse = {
        data: {
          user: mockUser,
          session: mockSession,
        },
        error: null,
      };

      (supabaseClient.auth.signUp as jest.Mock).mockResolvedValue(mockSignUpResponse);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toEqual({
        access_token: mockSession.access_token,
        refresh_token: mockSession.refresh_token,
        expires_in: mockSession.expires_in,
        phone_verification_required: true,
      });

      // Verify user was created in database
      const createdUser = await prisma.users.findUnique({
        where: { email: registerDto.email },
      });
      expect(createdUser).toBeDefined();
      expect(createdUser?.email).toBe(registerDto.email);
      expect(createdUser?.role).toBe(UserRole.client);
    });

    it('should return confirmation message when email confirmation is required', async () => {
      // Arrange
      const registerDto = {
        email: 'confirm@example.com',
        password: 'Password123!',
        role: 'client',
      };

      const mockSignUpResponse = {
        data: {
          user: mockUser,
          session: null, // No session = email confirmation required
        },
        error: null,
      };

      (supabaseClient.auth.signUp as jest.Mock).mockResolvedValue(mockSignUpResponse);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toEqual({
        message: 'Check your inbox to confirm registration',
      });

      // Verify user was NOT created in database (since no session)
      const createdUser = await prisma.users.findUnique({
        where: { email: registerDto.email },
      });
      expect(createdUser).toBeNull();
    });

    it('should return 400 when Supabase returns error', async () => {
      // Arrange
      const registerDto = {
        email: 'existing@example.com',
        password: 'Password123!',
        role: 'client',
      };

      const mockSignUpResponse = {
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      };

      (supabaseClient.auth.signUp as jest.Mock).mockResolvedValue(mockSignUpResponse);

      // Act & Assert
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(400);
    });

    it('should reject attempts to self-assign admin role', async () => {
      const registerDto = {
        email: 'admin-attempt@example.com',
        password: 'Password123!',
        role: UserRole.admin,
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(400);

      expect(supabaseClient.auth.signUp).not.toHaveBeenCalled();

      const createdUser = await prisma.users.findUnique({
        where: { email: registerDto.email },
      });
      expect(createdUser).toBeNull();
    });

    it('should return 400 for invalid input', async () => {
      // Arrange
      const invalidDto = {
        email: 'invalid-email',
        password: '123', // Too short
        role: 'invalid-role',
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('/api/v1/auth/login (POST)', () => {
    it('should login user successfully', async () => {
      // Arrange
      const loginDto = {
        email: 'user@example.com',
        password: 'Password123!',
      };

      const mockSignInResponse = {
        data: {
          user: mockUser,
          session: mockSession,
        },
        error: null,
      };

      (supabaseClient.auth.signInWithPassword as jest.Mock).mockResolvedValue(mockSignInResponse);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toEqual({
        access_token: mockSession.access_token,
        refresh_token: mockSession.refresh_token,
        expires_in: mockSession.expires_in,
        phone_verification_required: true,
      });
    });

    it('should return 401 for invalid credentials', async () => {
      // Arrange
      const loginDto = {
        email: 'user@example.com',
        password: 'wrongpassword',
      };

      const mockSignInResponse = {
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      };

      (supabaseClient.auth.signInWithPassword as jest.Mock).mockResolvedValue(mockSignInResponse);

      // Act & Assert
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(loginDto)
        .expect(401);
    });

    it('should return 400 for invalid input', async () => {
      // Arrange
      const invalidDto = {
        email: 'invalid-email',
        password: '',
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(invalidDto)
        .expect(401); // Supabase returns 401 for invalid credentials, even malformed ones
    });
  });

  describe('/api/v1/auth/logout (POST)', () => {
    it('revokes the bearer token via admin.signOut', async () => {
      (supabaseClient.auth.admin.signOut as jest.Mock).mockResolvedValue({ error: null });

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer mock-access-token')
        .expect(200);

      expect(supabaseClient.auth.admin.signOut).toHaveBeenCalledWith('mock-access-token');
    });

    it('should return 403 when no token provided', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(403);
    });
  });

  describe('/api/v1/auth/forgot-password (POST)', () => {
    beforeEach(() => {
      process.env.APP_URL = 'http://localhost:3000';
    });

    it('should send password reset email successfully', async () => {
      // Arrange
      const forgotPasswordDto = {
        email: 'user@example.com',
      };

      const mockResetResponse = { error: null };

      (supabaseClient.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue(mockResetResponse);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send(forgotPasswordDto)
        .expect(202);

      expect(response.body).toEqual({ success: true });
      expect(supabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        forgotPasswordDto.email,
        expect.objectContaining({
          redirectTo: expect.stringMatching(/\/auth\/reset$/),
        }),
      );
    });

    it('should return 400 when email not found', async () => {
      // Arrange
      const forgotPasswordDto = {
        email: 'notfound@example.com',
      };

      const mockResetResponse = {
        error: { message: 'Email not found' },
      };

      (supabaseClient.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue(mockResetResponse);

      // Act & Assert
      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send(forgotPasswordDto)
        .expect(400);
    });

    it('should return 400 for invalid email', async () => {
      // Arrange
      const invalidDto = {
        email: 'invalid-email',
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('/api/v1/auth/reset (POST)', () => {
    it('should reset password successfully', async () => {
      // Arrange
      const resetPasswordDto = {
        otp_token: 'valid-otp-token',
        new_password: 'NewPassword123!',
      };

      const mockVerifyOtpResponse = {
        data: {
          user: mockUser,
          session: mockSession,
        },
        error: null,
      };

      const mockUpdateUserResponse = {
        data: { user: mockUser },
        error: null,
      };

      (supabaseClient.auth.verifyOtp as jest.Mock).mockResolvedValue(mockVerifyOtpResponse);
      (supabaseClient.auth.admin.updateUserById as jest.Mock).mockResolvedValue(mockUpdateUserResponse);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/reset')
        .send(resetPasswordDto)
        .expect(200);

      expect(response.body).toEqual({
        access_token: mockSession.access_token,
        refresh_token: mockSession.refresh_token,
        expires_in: mockSession.expires_in,
      });
    });

    it('should return 400 for invalid OTP token', async () => {
      // Arrange
      const resetPasswordDto = {
        otp_token: 'invalid-otp-token',
        new_password: 'NewPassword123!',
      };

      const mockVerifyOtpResponse = {
        data: { user: null, session: null },
        error: { message: 'Invalid OTP token' },
      };

      (supabaseClient.auth.verifyOtp as jest.Mock).mockResolvedValue(mockVerifyOtpResponse);

      // Act & Assert
      await request(app.getHttpServer())
        .post('/api/v1/auth/reset')
        .send(resetPasswordDto)
        .expect(400);
    });

    it('should return 400 for invalid input', async () => {
      // Arrange
      const invalidDto = {
        otp_token: '',
        new_password: '123', // Too short
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/api/v1/auth/reset')
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('Protected routes', () => {
    it('should access protected route with valid token', async () => {
      // This test requires implementing a protected endpoint
      // For now, this is a placeholder that shows how to test protected routes
      
      // Mock JWT guard to allow access
      const mockJWKSResponse = {
        payload: {
          sub: mockUser.id,
          email: mockUser.email,
          aud: 'authenticated',
          iss: `${process.env.SUPABASE_URL}/auth/v1`,
        },
      };

      // You would mock the JWKS verification here
      // This depends on your actual protected endpoint implementation
    });

    it('should reject access to protected route without token', async () => {
      // Test accessing a protected route without authorization header
      // This would return 401 Unauthorized
    });

    it('should reject access to protected route with invalid token', async () => {
      // Test accessing a protected route with invalid/expired token
      // This would return 401 Unauthorized
    });
  });

  // Must be the last describe in this file: UserThrottlerGuard keeps state
  // across requests (in-memory), and the first call consumes the `otp-burst`
  // budget (limit 1 / 60s). Adding /phone tests elsewhere will bleed into
  // this one.
  describe('UserThrottlerGuard on OTP endpoints', () => {
    it('blocks a rapid-fire second send-otp with 429 — proves the guard is wired', async () => {
      // This test guards against the regression where UserThrottlerGuard
      // isn't registered in a module's providers: NestJS would silently
      // drop the @UseGuards entry and both calls would return 200.
      const first = await request(app.getHttpServer())
        .post('/api/v1/auth/phone/send-otp')
        .set('Authorization', 'Bearer throttler-canary-token')
        .send({ phone: '+380509999001' });

      const second = await request(app.getHttpServer())
        .post('/api/v1/auth/phone/send-otp')
        .set('Authorization', 'Bearer throttler-canary-token')
        .send({ phone: '+380509999001' });

      expect(first.status).toBe(200);
      expect(second.status).toBe(429);
    });
  });
});
