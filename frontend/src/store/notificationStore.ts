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
  emitStageChange: (event) =>
    set((s) => ({ lastStageChange: event, stageChangeSeq: s.stageChangeSeq + 1 })),
  emitInterviewReminder: (event) =>
    set((s) => ({
      lastInterviewReminder: event,
      interviewReminderSeq: s.interviewReminderSeq + 1,
    })),
  emitOfferResponded: (event) =>
    set((s) => ({ lastOfferResponded: event, offerRespondedSeq: s.offerRespondedSeq + 1 })),
}));
