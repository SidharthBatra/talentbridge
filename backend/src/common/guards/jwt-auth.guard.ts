import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Validates the short-lived access token (Passport `jwt` strategy).
 * Reusable across every module — pair with `RolesGuard` for RBAC.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
