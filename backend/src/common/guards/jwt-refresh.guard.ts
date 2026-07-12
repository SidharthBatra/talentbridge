import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Validates the long-lived refresh token (Passport `jwt-refresh` strategy).
 * Used only by POST /auth/refresh.
 */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
