import { apiClient } from './client';
import type { Role, User } from '../types';

export const usersApi = {
  list: () => apiClient.get<User[]>('/users').then((r) => r.data),

  get: (id: string) => apiClient.get<User>(`/users/${id}`).then((r) => r.data),

  updateRole: (id: string, role: Role) =>
    apiClient.patch<User>(`/users/${id}/role`, { role }).then((r) => r.data),

  deactivate: (id: string) =>
    apiClient.patch<User>(`/users/${id}/deactivate`).then((r) => r.data),
};
