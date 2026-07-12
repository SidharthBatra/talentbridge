import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';
import { RolesGuard } from './roles.guard';

/**
 * Verifies the reference RBAC pattern: a CANDIDATE is rejected on an
 * ADMIN-only route, an ADMIN passes, and routes without @Roles are open.
 */
describe('RolesGuard', () => {
  const makeContext = (
    userRole: Role | undefined,
    requiredRoles: Role[] | undefined,
  ): { ctx: ExecutionContext; reflector: Reflector } => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(requiredRoles),
    } as unknown as Reflector;

    const ctx = {
      getHandler: () => null,
      getClass: () => null,
      switchToHttp: () => ({
        getRequest: () => ({ user: userRole ? { role: userRole } : undefined }),
      }),
    } as unknown as ExecutionContext;

    return { ctx, reflector };
  };

  it('rejects a CANDIDATE on an ADMIN-only route', () => {
    const { ctx, reflector } = makeContext(Role.CANDIDATE, [Role.ADMIN]);
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows an ADMIN on an ADMIN-only route', () => {
    const { ctx, reflector } = makeContext(Role.ADMIN, [Role.ADMIN]);
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows any authenticated user when no roles are required', () => {
    const { ctx, reflector } = makeContext(Role.CANDIDATE, undefined);
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects when there is no user on the request', () => {
    const { ctx, reflector } = makeContext(undefined, [Role.RECRUITER]);
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
