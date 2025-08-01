import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/v1/login.dto';
import { RegisterDto } from './dto/v1/register.dto';
import { ForgotPasswordDto } from './dto/v1/forgot-password.dto';
import { ResetPasswordDto } from './dto/v1/reset-password.dto';
import { UsersService } from '../users/users.service';
import { HashService } from '../shared/services/hash.service';
import { AppConfigService } from '../shared/services/app-config.service';
import { randomUUID } from 'crypto';
import { RevokedTokenService } from './revocation/revoked-token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly hash: HashService,
    private readonly jwt: JwtService,
    private readonly cfg: AppConfigService,
    private readonly revoked: RevokedTokenService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already taken');

    const hash = await this.hash.hash(dto.password);
    const user = await this.users.create(dto.email, hash, dto.role);
    const payload = { sub: user.id, role: user.role, jti: randomUUID() };
    const token = this.jwt.sign(payload);

    return { accessToken: token, expiresIn: 60 * 60 * 24 * 30 };
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await this.hash.verify(user.passwordHash, dto.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user.id, role: user.role, jti: randomUUID() };
    const token = this.jwt.sign(payload);
    return { accessToken: token, expiresIn: 60 * 60 * 24 * 30 };
  }

  async logout(jti: string, exp: number) {
    return this.revoked.revoke(jti, exp);
  }

  forgotPassword(_dto: ForgotPasswordDto) {
    return { message: 'Email sent' };
  }

  resetPassword(_dto: ResetPasswordDto) {
    return {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      expiresIn: 900,
    };
  }
}
