import { Injectable } from '@nestjs/common';
import { LoginDto } from './dto/v1/login.dto';
import { RegisterDto } from './dto/v1/register.dto';
import { ForgotPasswordDto } from './dto/v1/forgot-password.dto';
import { ResetPasswordDto } from './dto/v1/reset-password.dto';

@Injectable()
export class AuthService {
  async login(_dto: LoginDto) {
    throw new Error('NotImplementedException: The login method is not implemented.');
  }

  async register(_dto: RegisterDto) {
    throw new NotImplementedException('The register method is not implemented.');
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
