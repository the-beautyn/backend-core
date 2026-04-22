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
import { AuthProvider } from '@prisma/client';
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

    const existingUser = await this.users.findByEmail(email);
    let isNewUser = false;
    const incomingProvider: AuthProvider = dto.provider === 'apple' ? 'apple' : 'google';

    if (!existingUser) {
      isNewUser = true;
      await this.users.createWithId(data.user.id, email, 'client', {
        name: dto.name,
        secondName: dto.secondName,
        authProvider: incomingProvider,
      });
    } else {
      // Supabase's "Link identities by email" behavior is configurable. When
      // it's NOT enabled, an OAuth sign-in for an already-registered email
      // creates a *new* Supabase user with a different ID, and the JWT we'd
      // return would have `sub` pointing at an ID we have no row for —
      // every authenticated request downstream would fail to resolve the
      // user. Refuse the sign-in and let the client route the user to
      // their original method via check-email.
      if (data.user.id !== existingUser.id) {
        throw new ConflictException({
          message:
            'This email is already registered with a different sign-in method. ' +
            'Sign in with that method, or link this provider from account settings.',
          code: 'AUTH_PROVIDER_MISMATCH',
          existingProvider: existingUser.authProvider,
        });
      }
      if (existingUser.authProvider !== incomingProvider) {
        // User previously used a different method (e.g. registered via email,
        // now signing in with Apple) and Supabase linked the identities so
        // the user ID is stable. Track the current method so check-email
        // routes them to the right UI next time.
        await this.users.setAuthProvider(existingUser.id, incomingProvider);
      }
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      is_new_user: isNewUser,
      phone_verification_required: this.phoneVerificationEnabled && (isNewUser || !existingUser?.isPhoneVerified),
    };
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

    const { error: updErr } = await this.sb.auth.updateUser({
      password: dto.new_password,
    });
    if (updErr) throw new BadRequestException(updErr.message);

    return {
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      expires_in: data.session?.expires_in,
    };
  }
}
