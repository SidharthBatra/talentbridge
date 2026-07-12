import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Role } from '../types';

const ROLE_HOME: Record<Role, string> = {
  [Role.CANDIDATE]: '/candidate',
  [Role.RECRUITER]: '/recruiter',
  [Role.HIRING_MANAGER]: '/hiring-manager',
  [Role.ADMIN]: '/admin',
};

export function roleHome(role: Role): string {
  return ROLE_HOME[role];
}

/**
 * Redirects unauthenticated users to /login, and authenticated users away
 * from routes that don't belong to their role (to their own dashboard).
 */
export function ProtectedRoute({
  allow,
  children,
}: {
  allow: Role[];
  children: ReactNode;
}) {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  if (!accessToken || !user) {
    return <Navigate to="/login" replace />;
  }
  if (!allow.includes(user.role)) {
    return <Navigate to={roleHome(user.role)} replace />;
  }
  return <>{children}</>;
}
