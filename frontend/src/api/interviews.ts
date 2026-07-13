import { apiClient } from './client';
import type { Interview, ProposeInterviewInput } from '../types';

export const interviewsApi = {
  propose: (input: ProposeInterviewInput) =>
    apiClient.post<Interview>('/interviews', input).then((r) => r.data),

  /** Interviews awaiting the current candidate's response, across all of their applications. */
  myPending: () =>
    apiClient.get<Interview[]>('/interviews/mine/pending').then((r) => r.data),

  /** Interviews scheduled for a given application (newest first). */
  byApplication: (applicationId: string) =>
    apiClient
      .get<Interview[]>(`/interviews/by-application/${applicationId}`)
      .then((r) => r.data),

  calendar: (userId: string) =>
    apiClient
      .get<Interview[]>('/interviews/calendar', { params: { userId } })
      .then((r) => r.data),

  get: (id: string) => apiClient.get<Interview>(`/interviews/${id}`).then((r) => r.data),

  confirm: (id: string, slot: string) =>
    apiClient.patch<Interview>(`/interviews/${id}/confirm`, { slot }).then((r) => r.data),

  requestAlternatives: (id: string) =>
    apiClient.patch<Interview>(`/interviews/${id}/request-alternatives`).then((r) => r.data),

  proposeNewSlots: (id: string, proposedSlots: string[]) =>
    apiClient.patch<Interview>(`/interviews/${id}/slots`, { proposedSlots }).then((r) => r.data),

  cancel: (id: string) =>
    apiClient.patch<Interview>(`/interviews/${id}/cancel`).then((r) => r.data),
};
