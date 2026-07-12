import { apiClient } from './client';
import type { CreateOfferInput, Offer, OfferResponseAction } from '../types';

export const offersApi = {
  create: (input: CreateOfferInput) =>
    apiClient.post<Offer>('/offers', input).then((r) => r.data),

  get: (id: string) => apiClient.get<Offer>(`/offers/${id}`).then((r) => r.data),

  approveAndSend: (id: string) =>
    apiClient.post<Offer>(`/offers/${id}/approve-and-send`).then((r) => r.data),

  respond: (id: string, response: OfferResponseAction, counterOffer?: string) =>
    apiClient
      .patch<Offer>(`/offers/${id}/respond`, { response, counterOffer })
      .then((r) => r.data),
};
