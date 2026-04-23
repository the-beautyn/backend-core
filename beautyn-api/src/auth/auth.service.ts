import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { LoginDto } from './dto/v1/login.dto';
import { RegisterDto, REGISTERABLE_ROLES } from './dto/v1/register.dto';
import { CheckEmailDto } from './dto/v1/check-email.dto';
import { EmailStatus } from './dto/v1/check-email-response.dto';
import { OAuthSignInDto } from './dto/v1/oauth-sign-in.dto';
import { ForgotPasswordDto } from './dto/v1/forgot-password.dto';
import { ResetPasswordDto } from './dto/v1/reset-password.dto';
import { UserService } from '../user/user.service';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import { AuthProvider, Prisma, UserRole } from '@prisma/client';
import { PhoneVerificationService } from './phone-verification.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserService,
    private readonly sb: SupabaseClient,
    private readonly config: ConfigService,
    private readonly phoneVerification: PhoneVerificationService,
  ) {}

  private get phoneVerificationEnabled(): boolean {
    return this.phoneVerification.isEnabled();
  }

  async checkEmail({ email }: CheckEmailDto): Promise<{ status: EmailStatus }> {
    const user = await this.users.findByEmail(email);
    if (!user) return { status: 'not_found' };

    const providerMap: Record<AuthProvider, EmailStatus> = {
      email: 'password',
      apple: 'apple',
      google: 'google',
    };
    return { status: providerMap[user.authProvider] ?? 'password' };
  }

  async register({ email, password, role, name, secondName }: RegisterDto) {
    if (!REGISTERABLE_ROLES.includes(role)) {
      throw new BadRequestException('Invalid role');
    }

    const { data, error } = await this.sb.auth.signUp({
      email,
      password,
      options: { data: { user_role: role } },
    });
    if (error) throw new BadRequestException(error.message);

    if (!data.session)
      return { message: 'Check your inbox to confirm registration' };

    await this.users.createWithId(data.user!.id, email, role, {
      name,
      secondName,
      authProvider: 'email',
    });

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      phone_verification_required: this.phoneVerificationEnabled,
    };
  }

  async oauthSignIn(dto: OAuthSignInDto) {
    const { data, error } = await this.sb.auth.signInWithIdToken({
      provider: dto.provider,
      token: dto.idToken,
      ...(dto.nonce ? { nonce: dto.nonce } : {}),
    });
    if (error) throw new BadRequestException(error.message);
    if (!data.session || !data.user) {
      throw new BadRequestException('OAuth sign-in failed: no session returned');
    }

    const email = data.user.email;
    if (!email) throw new BadRequestException('OAuth provider did not return an email');

    let storedUser = await this.users.findByEmail(email);
    let isNewUser = false;
    const incomingProvider: AuthProvider = dto.provider === 'apple' ? 'apple' : 'google';

    if (storedUser) {
      await this.reconcileOauthProvider(storedUser, data.user.id, incomingProvider);
    } else {
      try {
        await this.users.createWithId(data.user.id, email, 'client', {
          name: dto.name,
          secondName: dto.secondName,
          authProvider: incomingProvider,
        });
        await this.mirrorUserRoleToSupabase(data.user.id, 'client');
        isNewUser = true;
      } catch (err) {
        // Two concurrent first-time OAuth sign-ins for the same email would
        // both pass the findByEmail check above and race on createWithId.
        // The loser gets P2002 on the unique email constraint — re-fetch the
        // winner's row and continue as if it had existed all along.
        if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') {
          throw err;
        }
        storedUser = await this.users.findByEmail(email);
        if (!storedUser) throw err;
        await this.reconcileOauthProvider(storedUser, data.user.id, incomingProvider);
      }
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      is_new_user: isNewUser,
      phone_verification_required:
        this.phoneVerificationEnabled && (isNewUser || !storedUser?.isPhoneVerified),
    };
  }

  /**
   * Validates and (if needed) updates a stored user row during OAuth sign-in:
   *
   * - Throws `AUTH_PROVIDER_MISMATCH` if the Supabase OAuth user id doesn't
   *   match the stored row (Supabase's "link by email" is off, so the JWT
   *   we'd return has a `sub` we can't resolve).
   * - Updates `authProvider` if it's stale (e.g. registered via email, now
   *   signing in with Apple), so check-email routes the client correctly
   *   next time.
   */
  private async reconcileOauthProvider(
    storedUser: { id: string; authProvider: AuthProvider },
    incomingUserId: string,
    incomingProvider: AuthProvider,
  ): Promise<void> {
    if (incomingUserId !== storedUser.id) {
      throw new ConflictException({
        message:
          'This email is already registered with a different sign-in method. ' +
          'Sign in with that method, or link this provider from account settings.',
        code: 'AUTH_PROVIDER_MISMATCH',
        existingProvider: storedUser.authProvider,
      });
    }
    if (storedUser.authProvider !== incomingProvider) {
      await this.users.setAuthProvider(storedUser.id, incomingProvider);
    }
  }

  /**
   * Mirror the user's role into Supabase `user_metadata.user_role`.
   *
   * Email/password registration sets this via signUp({ options: { data }}).
   * OAuth sign-in (signInWithIdToken) doesn't, so without this step a
   * brand-new Apple/Google user authenticates but has `user_metadata.user_role`
   * undefined — JwtAuthGuard sets req.user.role to null, and every endpoint
   * protected by ClientRolesGuard / OwnerRolesGuard returns 403.
   */
  private async mirrorUserRoleToSupabase(userId: string, role: UserRole): Promise<void> {
    const { error } = await this.sb.auth.admin.updateUserById(userId, {
      user_metadata: { user_role: role },
    });
    if (error) throw new BadRequestException(error.message);
  }

  async login(dto: LoginDto) {
    const { data, error } = await this.sb.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });
    if (error) throw new UnauthorizedException(error.message);

    let phoneVerificationRequired = false;
    if (this.phoneVerificationEnabled) {
      const user = await this.users.findByEmail(dto.email);
      phoneVerificationRequired = !user?.isPhoneVerified;
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      phone_verification_required: phoneVerificationRequired,
    };
  }

  async refreshSession(refreshToken: string) {
    const { data, error } = await this.sb.auth.refreshSession({ refresh_token: refreshToken });
    if (error) throw new UnauthorizedException(error.message);
    if (!data.session) throw new UnauthorizedException('Failed to refresh session');

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
    };
  }

  async logout(accessToken: string) {
    // The shared client uses the service role key, so call the admin API
    // directly. Avoids mutating the shared client's session (which would
    // race with other concurrent requests) and actually revokes the
    // specific user's refresh tokens.
    const { error } = await this.sb.auth.admin.signOut(accessToken);
    if (error) throw new BadRequestException(error.message);
    return { message: 'Logged out' };
  }

  async forgotPassword({ email }: ForgotPasswordDto) {
    const appUrl = this.config.get<string>('APP_URL');
    const { error } = await this.sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/reset`,
    });
    if (error) throw new BadRequestException(error.message);
    return { message: 'Password-reset email sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { data, error } = await this.sb.auth.verifyOtp({
      type: 'recovery',
      token_hash: dto.otp_token,
    });
    if (error) throw new BadRequestException(error.message);
    if (!data.user?.email) {
      throw new BadRequestException('OTP verification did not return a user');
    }
    const email = data.user.email;

    // Update via the admin API rather than `this.sb.auth.updateUser(...)`.
    // updateUser() reads from the shared client's _currentSession, which
    // verifyOtp() just wrote to — a concurrent reset-password request can
    // overwrite that session between these two awaits and cause the wrong
    // user's password to be changed. Passing the userId explicitly to the
    // admin API removes the race.
    const { error: updErr } = await this.sb.auth.admin.updateUserById(
      data.user.id,
      { password: dto.new_password },
    );
    if (updErr) throw new BadRequestException(updErr.message);

    // The recovery session from verifyOtp is invalidated once the password
    // changes, so we sign in with the new password to mint fresh tokens the
    // client can actually use for authenticated requests.
    const { data: signInData, error: signInErr } = await this.sb.auth.signInWithPassword({
      email,
      password: dto.new_password,
    });
    if (signInErr) throw new UnauthorizedException(signInErr.message);
    if (!signInData.session) {
      throw new UnauthorizedException('Failed to sign in after password reset');
    }

    return {
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
      expires_in: signInData.session.expires_in,
    };
  }
}
