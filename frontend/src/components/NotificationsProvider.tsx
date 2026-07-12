import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { toast } from '../store/toastStore';
import { connectSocket, disconnectSocket } from '../lib/socket';
import type {
  ApplicationStageChangedEvent,
  InterviewReminderEvent,
  OfferRespondedEvent,
} from '../types';
import { ApplicationStage } from '../types';

const STAGE_LABELS: Record<ApplicationStage, string> = {
  [ApplicationStage.APPLIED]: 'Applied',
  [ApplicationStage.SCREENED]: 'Screened',
  [ApplicationStage.SHORTLISTED]: 'Shortlisted',
  [ApplicationStage.INTERVIEW_SCHEDULED]: 'Interview Scheduled',
  [ApplicationStage.OFFER]: 'Offer Extended',
  [ApplicationStage.HIRED]: 'Hired',
  [ApplicationStage.REJECTED]: 'Rejected',
};

/**
 * Mounted once near the app root. Opens the /notifications socket whenever
 * a user is logged in, tears it down on logout, and fans every event out
 * to both a toast and the notification store (so lists elsewhere can
 * react without prop drilling or a full query-cache library).
 */
export function NotificationsProvider() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const emitStageChange = useNotificationStore((s) => s.emitStageChange);
  const emitInterviewReminder = useNotificationStore((s) => s.emitInterviewReminder);
  const emitOfferResponded = useNotificationStore((s) => s.emitOfferResponded);

  useEffect(() => {
    if (!accessToken) {
      disconnectSocket();
      return;
    }

    const socket = connectSocket(accessToken);

    const onStageChanged = (event: ApplicationStageChangedEvent) => {
      emitStageChange(event);
      toast.info(
        'Application updated',
        `Stage changed to "${STAGE_LABELS[event.stage] ?? event.stage}"`,
      );
    };
    const onInterviewReminder = (event: InterviewReminderEvent) => {
      emitInterviewReminder(event);
      const when = new Date(event.confirmedSlot).toLocaleString();
      toast.info('Interview reminder', `Upcoming interview at ${when}`);
    };
    const onOfferResponded = (event: OfferRespondedEvent) => {
      emitOfferResponded(event);
      toast.info('Offer response received', `Candidate ${event.response} the offer`);
    };
    const onConnectError = () => {
      toast.error('Live updates unavailable', 'Could not connect to the notification service');
    };

    socket.on('application.stageChanged', onStageChanged);
    socket.on('interview.reminder', onInterviewReminder);
    socket.on('offer.responded', onOfferResponded);
    socket.on('connect_error', onConnectError);

    return () => {
      socket.off('application.stageChanged', onStageChanged);
      socket.off('interview.reminder', onInterviewReminder);
      socket.off('offer.responded', onOfferResponded);
      socket.off('connect_error', onConnectError);
    };
  }, [accessToken, emitStageChange, emitInterviewReminder, emitOfferResponded]);

  return null;
}
