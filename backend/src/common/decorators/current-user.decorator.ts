import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * The authenticated user payload attached to the request by JwtStrategy.
 * Shared shape so every module reads the same fields off `req.user`.
 */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
  companyId: string | null;
}

/**
 * Inject the current authenticated user (or one of its properties).
 *
 * @example  findMe(@CurrentUser() user: AuthenticatedUser) { ... }
 * @example  myId(@CurrentUser('userId') id: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;
    return data ? user?.[data] : user;
  },
);
