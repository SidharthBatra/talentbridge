import { apiClient } from './client';
import type {
  CreateJobPostingInput,
  JobPosting,
  JobPostingStats,
  JobStatus,
} from '../types';

export const jobsApi = {
  listPublished: () => apiClient.get<JobPosting[]>('/jobs/public').then((r) => r.data),

  getPublished: (id: string) =>
    apiClient.get<JobPosting>(`/jobs/public/${id}`).then((r) => r.data),

  listInternal: (status?: JobStatus) =>
    apiClient
      .get<JobPosting[]>('/jobs', { params: status ? { status } : undefined })
      .then((r) => r.data),

  get: (id: string) => apiClient.get<JobPosting>(`/jobs/${id}`).then((r) => r.data),

  getStats: (id: string) =>
    apiClient.get<JobPostingStats>(`/jobs/${id}/stats`).then((r) => r.data),

  create: (input: CreateJobPostingInput) =>
    apiClient.post<JobPosting>('/jobs', input).then((r) => r.data),

  update: (id: string, input: Partial<CreateJobPostingInput>) =>
    apiClient.patch<JobPosting>(`/jobs/${id}`, input).then((r) => r.data),

  updateStatus: (id: string, status: JobStatus) =>
    apiClient.patch<JobPosting>(`/jobs/${id}/status`, { status }).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete<{ message: string }>(`/jobs/${id}`).then((r) => r.data),
};
