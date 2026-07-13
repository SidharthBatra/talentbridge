import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiErrorMessage } from '../../api/client';
import { applicationsApi } from '../../api/applications';
import { interviewsApi } from '../../api/interviews';
import { offersApi } from '../../api/offers';
import { InterviewResponseCard } from '../../components/candidate/InterviewResponseCard';
import { OfferResponseCard } from '../../components/candidate/OfferResponseCard';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { StageStepper } from '../../components/ui/StageStepper';
import { useNotificationStore } from '../../store/notificationStore';
import type { Application, Interview, Offer } from '../../types';

export function MyApplicationsPage() {
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [pendingInterviews, setPendingInterviews] = useState<Record<string, Interview>>({});
  const [pendingOffers, setPendingOffers] = useState<Record<string, Offer>>({});
  const [error, setError] = useState<string | null>(null);
  const stageChangeSeq = useNotificationStore((s) => s.stageChangeSeq);
  const interviewReminderSeq = useNotificationStore((s) => s.interviewReminderSeq);
  const offerRespondedSeq = useNotificationStore((s) => s.offerRespondedSeq);

  // Application ids whose "Respond" panel has been expanded inline.
  const [expanded, setExpanded] = useState<Record<string, 'interview' | 'offer' | null>>({});

  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('applicationId');

  const load = () => {
    setError(null);
    Promise.all([applicationsApi.list(), interviewsApi.myPending(), offersApi.myPending()])
      .then(([apps, interviews, offers]) => {
        setApplications(apps);
        setPendingInterviews(Object.fromEntries(interviews.map((i) => [i.applicationId, i])));
        setPendingOffers(Object.fromEntries(offers.map((o) => [o.applicationId, o])));
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load your applications')));
  };

  // Refetch whenever a real-time stage-change, interview, or offer notification arrives.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [stageChangeSeq, interviewReminderSeq, offerRespondedSeq]);

  // Scroll to the application a notification linked to (rendered id below).
  useEffect(() => {
    if (!highlightId || !applications) return;
    document
      .getElementById(`application-${highlightId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightId, applications]);

  const toggle = (applicationId: string, panel: 'interview' | 'offer') => {
    setExpanded((prev) => ({
      ...prev,
      [applicationId]: prev[applicationId] === panel ? null : panel,
    }));
  };

  return (
    <div className="space-y-xl">
      <PageHeader title="My Applications" subtitle="Track every application's progress in real time." />

      {applications === null && !error && <LoadingState label="Loading applications…" />}
      {error && <ErrorState message={error} onRetry={load} />}
      {applications && applications.length === 0 && (
        <EmptyState
          icon="folder_off"
          title="No applications yet"
          description="Browse open roles and apply to start your pipeline."
        />
      )}

      <div className="space-y-md">
        {applications?.map((app) => {
          const interview = pendingInterviews[app.id];
          const offer = pendingOffers[app.id];
          const isHighlighted = highlightId === app.id;

          return (
            <Card
              key={app.id}
              id={`application-${app.id}`}
              className={`p-lg space-y-md ${
                isHighlighted ? 'ring-2 ring-primary border-primary' : ''
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-sm">
                <div>
                  <p className="text-title-md font-title-md text-on-surface">
                    Application #{app.id.slice(0, 8)}
                  </p>
                  <p className="text-label-sm text-on-surface-variant">
                    Applied {new Date(app.createdAt).toLocaleDateString()}
                    {app.aiScore !== null && ` · AI match score: ${app.aiScore}/100`}
                  </p>
                </div>
              </div>
              <StageStepper stage={app.stage} />
              {app.aiStrengths && app.aiStrengths.length > 0 && (
                <div className="text-body-md text-on-surface-variant">
                  <span className="font-semibold text-secondary">Strengths noted: </span>
                  {app.aiStrengths.join(', ')}
                </div>
              )}

              {interview && (
                <div className="border-t border-outline-variant pt-md space-y-sm">
                  <div className="flex flex-wrap items-center justify-between gap-sm">
                    <div className="flex items-center gap-xs text-primary">
                      <Icon name="event_available" filled size={18} />
                      <span className="text-body-md font-semibold">
                        An interview proposal is waiting for your response
                      </span>
                    </div>
                    <Button size="sm" onClick={() => toggle(app.id, 'interview')}>
                      {expanded[app.id] === 'interview' ? 'Hide' : 'Respond'}
                    </Button>
                  </div>
                  {expanded[app.id] === 'interview' && (
                    <InterviewResponseCard interviewId={interview.id} />
                  )}
                </div>
              )}

              {offer && (
                <div className="border-t border-outline-variant pt-md space-y-sm">
                  <div className="flex flex-wrap items-center justify-between gap-sm">
                    <div className="flex items-center gap-xs text-primary">
                      <Icon name="request_quote" filled size={18} />
                      <span className="text-body-md font-semibold">
                        An offer is waiting for your response
                      </span>
                    </div>
                    <Button size="sm" onClick={() => toggle(app.id, 'offer')}>
                      {expanded[app.id] === 'offer' ? 'Hide' : 'Respond'}
                    </Button>
                  </div>
                  {expanded[app.id] === 'offer' && <OfferResponseCard offerId={offer.id} />}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
