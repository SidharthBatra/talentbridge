import { useEffect, useState } from 'react';
import { apiErrorMessage } from '../../api/client';
import { applicationsApi } from '../../api/applications';
import { InterviewResponseCard } from '../../components/candidate/InterviewResponseCard';
import { OfferResponseCard } from '../../components/candidate/OfferResponseCard';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { StageStepper } from '../../components/ui/StageStepper';
import { useNotificationStore } from '../../store/notificationStore';
import type { Application } from '../../types';

export function MyApplicationsPage() {
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stageChangeSeq = useNotificationStore((s) => s.stageChangeSeq);
  const knownInterviewIds = useNotificationStore((s) => s.knownInterviewIds);

  const [interviewLookup, setInterviewLookup] = useState('');
  const [activeInterviewId, setActiveInterviewId] = useState<string | null>(null);
  const [offerLookup, setOfferLookup] = useState('');
  const [activeOfferId, setActiveOfferId] = useState<string | null>(null);

  const load = () => {
    setError(null);
    applicationsApi
      .list()
      .then(setApplications)
      .catch((err) => setError(apiErrorMessage(err, 'Could not load your applications')));
  };

  // Refetch whenever a real-time stage-change notification arrives.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [stageChangeSeq]);

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
        {applications?.map((app) => (
          <Card key={app.id} className="p-lg space-y-md">
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
          </Card>
        ))}
      </div>

      {/* See notificationStore.ts LIMITATION comment: the API has no way for
          a candidate to discover a pending interview/offer id, so we accept
          one out-of-band (as if received by email) or from any id already
          surfaced via a reminder notification. */}
      <Card className="p-lg space-y-md">
        <div className="flex items-center gap-xs">
          <Icon name="event_available" className="text-primary" />
          <h2 className="text-title-md font-title-md text-on-surface">Respond to an Interview</h2>
        </div>
        <p className="text-body-md text-on-surface-variant">
          Enter an interview ID (from your invite email) to confirm a time slot.
        </p>
        <div className="flex gap-sm">
          <Input
            placeholder="Interview ID"
            value={interviewLookup}
            onChange={(e) => setInterviewLookup(e.target.value)}
            className="flex-1"
          />
          <Button onClick={() => setActiveInterviewId(interviewLookup.trim())} disabled={!interviewLookup.trim()}>
            Look up
          </Button>
        </div>
        {knownInterviewIds.length > 0 && (
          <div className="flex flex-wrap gap-xs">
            {knownInterviewIds.map((id) => (
              <button
                key={id}
                onClick={() => setActiveInterviewId(id)}
                className="text-label-sm bg-surface-container-high hover:bg-surface-container-highest px-sm py-xs rounded-full"
              >
                {id.slice(0, 8)}…
              </button>
            ))}
          </div>
        )}
        {activeInterviewId && <InterviewResponseCard interviewId={activeInterviewId} />}
      </Card>

      <Card className="p-lg space-y-md">
        <div className="flex items-center gap-xs">
          <Icon name="request_quote" className="text-primary" />
          <h2 className="text-title-md font-title-md text-on-surface">Respond to an Offer</h2>
        </div>
        <p className="text-body-md text-on-surface-variant">
          Enter an offer ID (from your offer email) to accept, reject, or counter.
        </p>
        <div className="flex gap-sm">
          <Input
            placeholder="Offer ID"
            value={offerLookup}
            onChange={(e) => setOfferLookup(e.target.value)}
            className="flex-1"
          />
          <Button onClick={() => setActiveOfferId(offerLookup.trim())} disabled={!offerLookup.trim()}>
            Look up
          </Button>
        </div>
        {activeOfferId && <OfferResponseCard offerId={activeOfferId} />}
      </Card>
    </div>
  );
}
