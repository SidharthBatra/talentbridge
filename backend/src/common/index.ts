/**
 * Public surface of the shared auth scaffolding.
 * Other modules should import from `@common` (or `../../common`) instead of
 * reaching into individual files, so the auth contract stays stable.
 *
 *   import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, Role } from '@common';
 */
export { Role } from './enums/role.enum';
export { Roles, ROLES_KEY } from './decorators/roles.decorator';
export {
  CurrentUser,
  AuthenticatedUser,
} from './decorators/current-user.decorator';
export { JwtAuthGuard } from './guards/jwt-auth.guard';
export { JwtRefreshGuard } from './guards/jwt-refresh.guard';
export { RolesGuard } from './guards/roles.guard';
