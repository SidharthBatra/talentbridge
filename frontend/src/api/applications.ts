import { apiClient } from './client';
import type {
  Application,
  ApplicationQuery,
  ApplicationStage,
  BulkActionResult,
  CreateApplicationInput,
} from '../types';

export const applicationsApi = {
  create: (input: CreateApplicationInput) =>
    apiClient.post<Application>('/applications', input).then((r) => r.data),

  uploadCv: (applicationId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient
      .post<Application>(`/applications/${applicationId}/cv`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  list: (query: ApplicationQuery = {}) =>
    apiClient.get<Application[]>('/applications', { params: query }).then((r) => r.data),

  get: (id: string) => apiClient.get<Application>(`/applications/${id}`).then((r) => r.data),

  updateStage: (id: string, stage: ApplicationStage) =>
    apiClient.patch<Application>(`/applications/${id}/stage`, { stage }).then((r) => r.data),

  bulkAction: (applicationIds: string[], action: 'advance' | 'reject') =>
    apiClient
      .post<BulkActionResult>('/applications/bulk-action', { applicationIds, action })
      .then((r) => r.data),
};
