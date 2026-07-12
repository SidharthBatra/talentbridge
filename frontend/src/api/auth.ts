import { apiClient } from './client';
import type { AuthTokens, Role } from '../types';

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role: Role;
  companyId?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export const authApi = {
  register: (input: RegisterInput) =>
    apiClient.post<AuthTokens>('/auth/register', input).then((r) => r.data),

  login: (input: LoginInput) =>
    apiClient.post<AuthTokens>('/auth/login', input).then((r) => r.data),

  logout: (refreshToken: string) =>
    apiClient.post('/auth/logout', { refreshToken }).then((r) => r.data),
};
