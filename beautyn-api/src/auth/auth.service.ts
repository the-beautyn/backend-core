import { Injectable } from '@nestjs/common';
import { LoginDto } from './dto/v1/login.dto';
import { RegisterDto } from './dto/v1/register.dto';
import { ForgotPasswordDto } from './dto/v1/forgot-password.dto';
import { ResetPasswordDto } from './dto/v1/reset-password.dto';

@Injectable()
export class AuthService {
  async login(_dto: LoginDto) {
    return { accessToken: '<jwt>', expiresIn: 900 };
  }

  async register(_dto: RegisterDto) {
    return { id: 'uuid', email: 'user@example.com' };
  }

  async logout() {
    return null;
  }

  async forgotPassword(_dto: ForgotPasswordDto) {
    return { message: 'Email sent' };
  }

  async resetPassword(_dto: ResetPasswordDto) {
    return { message: 'Password updated' };
  }
}
