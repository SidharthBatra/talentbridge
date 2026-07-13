import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { applicationsApi } from '../../api/applications';
import { apiErrorMessage } from '../../api/client';
import { jobsApi } from '../../api/jobs';
import { IssueOfferModal } from '../../components/hiring-manager/IssueOfferModal';
import { InterviewPrepModal } from '../../components/hiring-manager/InterviewPrepModal';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { StageBadge } from '../../components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { toast } from '../../store/toastStore';
import { useNotificationStore } from '../../store/notificationStore';
import { ApplicationStage, type Application, type JobPosting } from '../../types';

const RELEVANT_STAGES = [
  ApplicationStage.SHORTLISTED,
  ApplicationStage.INTERVIEW_SCHEDULED,
  ApplicationStage.OFFER,
];

export function ShortlistPage() {
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [jobsById, setJobsById] = useState<Record<string, JobPosting>>({});
  const [error, setError] = useState<string | null>(null);
  const [prepTarget, setPrepTarget] = useState<Application | null>(null);
  const [offerTarget, setOfferTarget] = useState<Application | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const stageChangeSeq = useNotificationStore((s) => s.stageChangeSeq);
  const interviewReminderSeq = useNotificationStore((s) => s.interviewReminderSeq);
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('applicationId');

  const load = () => {
    setError(null);
    applicationsApi
      .list()
      .then(async (apps) => {
        const relevant = apps.filter((a) => RELEVANT_STAGES.includes(a.stage));
        setApplications(relevant);
        const uniqueJobIds = [...new Set(relevant.map((a) => a.jobPostingId))];
        const jobs = await Promise.all(uniqueJobIds.map((jid) => jobsApi.get(jid)));
        setJobsById(Object.fromEntries(jobs.map((j) => [j.id, j])));
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load shortlisted candidates')));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [stageChangeSeq, interviewReminderSeq]);

  // Scroll to the application a notification linked to (rendered id below).
  useEffect(() => {
    if (!highlightId || !applications) return;
    document
      .getElementById(`application-${highlightId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightId, applications]);

  const advance = async (app: Application, next: ApplicationStage) => {
    setActingId(app.id);
    try {
      await applicationsApi.updateStage(app.id, next);
      toast.success('Application updated');
      load();
    } catch (err) {
      toast.error('Could not update stage', apiErrorMessage(err));
    } finally {
      setActingId(null);
    }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (applications === null) return <LoadingState label="Loading shortlisted candidates…" />;

  return (
    <div className="space-y-lg">
      <PageHeader
        title="Shortlisted Candidates"
        subtitle="Interview, evaluate, and make hiring decisions."
      />

      {applications.length === 0 && (
        <EmptyState
          icon="star_border"
          title="No shortlisted candidates yet"
          description="Candidates recruiters shortlist will appear here."
        />
      )}

      <div className="space-y-sm">
        {applications.map((app) => {
          const job = jobsById[app.jobPostingId];
          const isHighlighted = highlightId === app.id;
          return (
            <Card
              key={app.id}
              id={`application-${app.id}`}
              className={`p-lg space-y-sm ${isHighlighted ? 'ring-2 ring-primary border-primary' : ''}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-sm">
                <div>
                  <p className="text-title-md font-title-md text-on-surface">
                    {job?.title ?? 'Loading role…'}
                  </p>
                  <p className="text-label-sm text-on-surface-variant">
                    Candidate #{app.candidateId.slice(0, 8)} · {app.yearsOfExperience} yrs experience
                    {app.aiScore !== null && ` · AI score ${app.aiScore}`}
                  </p>
                </div>
                <StageBadge stage={app.stage} />
              </div>

              {app.aiStrengths && app.aiStrengths.length > 0 && (
                <p className="text-body-md text-secondary">+ {app.aiStrengths.join(' · ')}</p>
              )}

              <div className="flex flex-wrap gap-xs pt-xs">
                <Button size="sm" variant="secondary" icon="quiz" onClick={() => setPrepTarget(app)}>
                  Interview Prep
                </Button>

                {app.stage === ApplicationStage.SHORTLISTED && (
                  <Button
                    size="sm"
                    icon="event"
                    loading={actingId === app.id}
                    onClick={() => advance(app, ApplicationStage.INTERVIEW_SCHEDULED)}
                  >
                    Mark Interview Scheduled
                  </Button>
                )}

                {app.stage === ApplicationStage.INTERVIEW_SCHEDULED && (
                  <Button
                    size="sm"
                    icon="workspace_premium"
                    loading={actingId === app.id}
                    onClick={() => advance(app, ApplicationStage.OFFER)}
                  >
                    Move to Offer Stage
                  </Button>
                )}

                {app.stage === ApplicationStage.OFFER && job && (
                  <Button size="sm" variant="ai" icon="request_quote" onClick={() => setOfferTarget(app)}>
                    Issue Offer
                  </Button>
                )}

                {app.stage === ApplicationStage.OFFER && (
                  <Button
                    size="sm"
                    icon="check_circle"
                    loading={actingId === app.id}
                    onClick={() => advance(app, ApplicationStage.HIRED)}
                  >
                    Mark Hired
                  </Button>
                )}

                {[ApplicationStage.SHORTLISTED, ApplicationStage.INTERVIEW_SCHEDULED, ApplicationStage.OFFER].includes(
                  app.stage,
                ) && (
                  <Button
                    size="sm"
                    variant="danger"
                    icon="close"
                    loading={actingId === app.id}
                    onClick={() => advance(app, ApplicationStage.REJECTED)}
                  >
                    Reject
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {prepTarget && <InterviewPrepModal application={prepTarget} onClose={() => setPrepTarget(null)} />}
      {offerTarget && jobsById[offerTarget.jobPostingId] && (
        <IssueOfferModal
          application={offerTarget}
          job={jobsById[offerTarget.jobPostingId]}
          onClose={() => setOfferTarget(null)}
          onSent={() => {
            setOfferTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
}
