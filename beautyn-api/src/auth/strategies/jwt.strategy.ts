import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../../shared/services/app-config.service';
import { RevokedTokenService } from '../revocation/revoked-token.service';

interface JwtPayload {
  sub: string;
  role: 'client' | 'owner' | 'admin';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    cfg: AppConfigService,
    private revoked: RevokedTokenService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: cfg.jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    if (await this.revoked.isRevoked(payload.jti)) {
      throw new UnauthorizedException('Token revoked');
    }
    return {
      userId: payload.sub,
      role: payload.role,
      jti: payload.jti,
      exp: payload.exp,
    };
  }
}
