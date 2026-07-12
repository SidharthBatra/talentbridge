import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface RefreshTokenPayload {
  sub: string;
  email: string;
  role: string;
  companyId: string | null;
}

export interface RefreshRequestUser extends RefreshTokenPayload {
  /** Raw refresh token, forwarded so the service can match its stored hash. */
  refreshToken: string;
}

/**
 * Validates the refresh token (from the request body `refreshToken` field)
 * against the refresh secret. The service layer additionally checks the
 * token against the persisted, non-revoked store.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.refreshSecret'),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: RefreshTokenPayload): RefreshRequestUser {
    return { ...payload, refreshToken: req.body?.refreshToken };
  }
}
