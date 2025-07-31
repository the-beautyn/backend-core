import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/v1/login.dto';
import { RegisterDto } from './dto/v1/register.dto';
import { ForgotPasswordDto } from './dto/v1/forgot-password.dto';
import { ResetPasswordDto } from './dto/v1/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(_dto: LoginDto) {
    const payload = { sub: 'uuid', role: 'client' as const };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken, expiresIn: 60 * 60 * 24 * 30 };
  }

  async register(_dto: RegisterDto) {
    return {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      expiresIn: 900,
    };
  }

  async logout() {
    return null;
  }

  async forgotPassword(_dto: ForgotPasswordDto) {
    return { message: 'Email sent' };
  }

  async resetPassword(_dto: ResetPasswordDto) {
    return {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      expiresIn: 900,
    };
  }
}
