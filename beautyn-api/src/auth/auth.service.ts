import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { LoginDto } from './dto/v1/login.dto';
import { RegisterDto } from './dto/v1/register.dto';
import { ForgotPasswordDto } from './dto/v1/forgot-password.dto';
import { ResetPasswordDto } from './dto/v1/reset-password.dto';
import { UsersService } from '../users/users.service';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly sb: SupabaseClient
  ) {}

  async register({ email, password, role }: RegisterDto) {
    const { data, error } = await this.sb.auth.signUp({
      email,
      password,
      options: { data: { user_role: role } },   // lands in JWT → RLS
    });
    if (error) throw new BadRequestException(error.message);

    // When "Confirm email" is ON, session is null.
    if (!data.session)
      return { message: 'Check your inbox to confirm registration' };

    const user = await this.users.create(email, role);

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
    };
  }

  async login(dto: LoginDto) {
    const { data, error } = await this.sb.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });                                                            // :contentReference[oaicite:2]{index=2}
    if (error) throw new UnauthorizedException(error.message);

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
    };
  }

  async logout(accessToken: string) {
    // Build a “scoped” client that holds the user session
    const userSb = this.sb
      .auth
      .setSession({ access_token: accessToken, refresh_token: '' });

    const { error } = await this.sb.auth.signOut();                 // :contentReference[oaicite:3]{index=3}
    if (error) throw new BadRequestException(error.message);
    return { message: 'Logged out (refresh tokens revoked)' };
  }

  async forgotPassword({ email }: ForgotPasswordDto) {
    const { error } = await this.sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.APP_URL}/auth/reset`,              // your deep-link
    });                                                             // :contentReference[oaicite:4]{index=4}
    if (error) throw new BadRequestException(error.message);
    return { message: 'Password-reset email sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    // dto: { token_hash: string, newPassword: string }   ← OTP style
    const { data, error } = await this.sb.auth.verifyOtp({
      type: 'recovery',
      token_hash: dto.otpToken,
    });
    if (error) throw new BadRequestException(error.message);

    const { error: updErr } = await this.sb.auth.updateUser({
      password: dto.newPassword,
    });
    if (updErr) throw new BadRequestException(updErr.message);

    return {
      accessToken: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
      expiresIn: data.session?.expires_in,
    };
  }
}
