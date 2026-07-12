/**
 * Shared user roles. Kept in `common` so every module (auth, users,
 * jobs/pipeline, AI) references one canonical enum.
 */
export enum Role {
  CANDIDATE = 'CANDIDATE',
  RECRUITER = 'RECRUITER',
  HIRING_MANAGER = 'HIRING_MANAGER',
  ADMIN = 'ADMIN',
}
