import { create } from 'zustand';
import type {
  ApplicationStageChangedEvent,
  InterviewReminderEvent,
  OfferRespondedEvent,
} from '../types';

/**
 * Latest-event-plus-sequence store fed by the socket provider. Pages
 * `useEffect` on the `seq` counter (not the payload, which may repeat) to
 * know when to refetch/patch their local lists — a lightweight alternative
 * to a full query-invalidation cache for this app's scope.
 */
interface NotificationState {
  stageChangeSeq: number;
  lastStageChange: ApplicationStageChangedEvent | null;
  interviewReminderSeq: number;
  lastInterviewReminder: InterviewReminderEvent | null;
  offerRespondedSeq: number;
  lastOfferResponded: OfferRespondedEvent | null;
  /**
   * LIMITATION: the API has no `GET /interviews?applicationId=` or
   * `?candidateId=` endpoint, and no WebSocket event fires when an
   * interview is first *proposed* (only `interview.reminder`, ~24h before
   * a *confirmed* slot). So a candidate has no reliable way to discover a
   * pending interview's id through the app. As a best-effort workaround,
   * any interview id the candidate's socket happens to observe (via a
   * reminder) is cached here, and the UI also accepts a manually-entered
   * id (as if received out-of-band, e.g. by email) — see
   * `pages/candidate/MyApplicationsPage.tsx`.
   */
  knownInterviewIds: string[];
  emitStageChange: (event: ApplicationStageChangedEvent) => void;
  emitInterviewReminder: (event: InterviewReminderEvent) => void;
  emitOfferResponded: (event: OfferRespondedEvent) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  stageChangeSeq: 0,
  lastStageChange: null,
  interviewReminderSeq: 0,
  lastInterviewReminder: null,
  offerRespondedSeq: 0,
  lastOfferResponded: null,
  knownInterviewIds: [],
  emitStageChange: (event) =>
    set((s) => ({ lastStageChange: event, stageChangeSeq: s.stageChangeSeq + 1 })),
  emitInterviewReminder: (event) =>
    set((s) => ({
      lastInterviewReminder: event,
      interviewReminderSeq: s.interviewReminderSeq + 1,
      knownInterviewIds: s.knownInterviewIds.includes(event.interviewId)
        ? s.knownInterviewIds
        : [...s.knownInterviewIds, event.interviewId],
    })),
  emitOfferResponded: (event) =>
    set((s) => ({ lastOfferResponded: event, offerRespondedSeq: s.offerRespondedSeq + 1 })),
}));
