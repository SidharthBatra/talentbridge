import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { aiApi } from '../../api/ai';
import { applicationsApi } from '../../api/applications';
import { apiErrorMessage } from '../../api/client';
import { interviewsApi } from '../../api/interviews';
import { jobsApi } from '../../api/jobs';
import { usersApi } from '../../api/users';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { StageBadge } from '../../components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { toast } from '../../store/toastStore';
import { ApplicationStage, InterviewType, type Application, type JobPosting, type User } from '../../types';

export function ApplicationsForJobPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'aiScore' | 'createdAt' | 'updatedAt'>('aiScore');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scoringId, setScoringId] = useState<string | null>(null);
  const [bulkActing, setBulkActing] = useState(false);

  const [scheduleTarget, setScheduleTarget] = useState<Application | null>(null);

  const load = () => {
    if (!id) return;
    setError(null);
    Promise.all([jobsApi.get(id), applicationsApi.list({ jobId: id, sortBy })])
      .then(([jobData, apps]) => {
        setJob(jobData);
        setApplications(apps);
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load applications')));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [id, sortBy]);

  const toggleSelect = (appId: string) => {
    setSelected((s) => {
      const next = new Set(s);
      next.has(appId) ? next.delete(appId) : next.add(appId);
      return next;
    });
  };

  const handleBulk = async (action: 'advance' | 'reject') => {
    setBulkActing(true);
    try {
      const result = await applicationsApi.bulkAction(Array.from(selected), action);
      toast.success(
        `${result.succeeded.length} application(s) ${action === 'advance' ? 'advanced' : 'rejected'}`,
        result.failed.length ? `${result.failed.length} could not be updated` : undefined,
      );
      setSelected(new Set());
      load();
    } catch (err) {
      toast.error('Bulk action failed', apiErrorMessage(err));
    } finally {
      setBulkActing(false);
    }
  };

  const handleScore = async (applicationId: string) => {
    setScoringId(applicationId);
    try {
      const result = await aiApi.scoreCv(applicationId);
      if (result.scored) {
        toast.success('CV scored', `Match score: ${result.matchScore}/100`);
      } else {
        toast.info('Manual review required', result.message ?? 'AI scoring unavailable');
      }
      load();
    } catch (err) {
      toast.error('Scoring failed', apiErrorMessage(err));
    } finally {
      setScoringId(null);
    }
  };

  const sortedNote = useMemo(
    () => (sortBy === 'aiScore' ? 'Sorted by AI match score (highest first)' : `Sorted by ${sortBy}`),
    [sortBy],
  );

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!job || applications === null) return <LoadingState label="Loading applications…" />;

  return (
    <div className="space-y-lg">
      <PageHeader title={`Applicants — ${job.title}`} subtitle={sortedNote} />

      <div className="flex flex-wrap items-center justify-between gap-sm">
        <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="md:w-56">
          <option value="aiScore">Sort by AI Score</option>
          <option value="createdAt">Sort by Date Applied</option>
          <option value="updatedAt">Sort by Last Updated</option>
        </Select>

        {selected.size > 0 && (
          <div className="flex items-center gap-sm bg-surface-container-lowest border border-outline-variant rounded-lg px-md py-xs">
            <span className="text-label-sm text-on-surface-variant">{selected.size} selected</span>
            <Button size="sm" onClick={() => handleBulk('advance')} loading={bulkActing} icon="arrow_forward">
              Advance
            </Button>
            <Button size="sm" variant="danger" onClick={() => handleBulk('reject')} loading={bulkActing} icon="close">
              Reject
            </Button>
          </div>
        )}
      </div>

      {applications.length === 0 && (
        <EmptyState icon="groups" title="No applicants yet" description="Check back once candidates apply." />
      )}

      <div className="space-y-sm">
        {applications.map((app) => (
          <Card key={app.id} className="p-md flex flex-col md:flex-row md:items-center gap-md">
            <input
              type="checkbox"
              className="w-4 h-4 accent-primary shrink-0"
              checked={selected.has(app.id)}
              onChange={() => toggleSelect(app.id)}
            />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-sm">
                <span className="text-body-md font-semibold text-on-surface">
                  Candidate #{app.candidateId.slice(0, 8)}
                </span>
                <StageBadge stage={app.stage} />
                {app.aiScore !== null && (
                  <span className="text-label-sm bg-primary text-on-primary px-sm py-[2px] rounded-full">
                    AI Score: {app.aiScore}
                  </span>
                )}
              </div>
              <p className="text-label-sm text-on-surface-variant mt-xs">
                {app.yearsOfExperience} yrs experience
                {app.salaryExpectation && ` · $${app.salaryExpectation.toLocaleString()} expected`}
                {!app.cvExtractedText && ' · No CV uploaded yet'}
              </p>
              {app.aiStrengths && app.aiStrengths.length > 0 && (
                <p className="text-label-sm text-secondary mt-xs">+ {app.aiStrengths.join(' · ')}</p>
              )}
              {app.aiGaps && app.aiGaps.length > 0 && (
                <p className="text-label-sm text-tertiary-container mt-xs">- {app.aiGaps.join(' · ')}</p>
              )}
            </div>
            <div className="flex gap-xs shrink-0">
              <Button
                size="sm"
                variant="ai"
                icon="auto_awesome"
                loading={scoringId === app.id}
                disabled={!app.cvExtractedText}
                onClick={() => handleScore(app.id)}
              >
                Score CV
              </Button>
              {app.stage === ApplicationStage.SHORTLISTED && (
                <Button size="sm" variant="secondary" icon="event" onClick={() => setScheduleTarget(app)}>
                  Schedule
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {scheduleTarget && (
        <ScheduleInterviewModal application={scheduleTarget} onClose={() => setScheduleTarget(null)} />
      )}
    </div>
  );
}

function ScheduleInterviewModal({
  application,
  onClose,
}: {
  application: Application;
  onClose: () => void;
}) {
  const [hiringManagers, setHiringManagers] = useState<User[] | null>(null);
  const [hiringManagersError, setHiringManagersError] = useState<string | null>(null);
  const [hiringManagerId, setHiringManagerId] = useState('');
  const [type, setType] = useState<InterviewType>(InterviewType.TECHNICAL);
  const [slot1, setSlot1] = useState('');
  const [slot2, setSlot2] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    usersApi
      .hiringManagers()
      .then((users) => {
        setHiringManagers(users);
        if (users.length > 0) setHiringManagerId(users[0].id);
      })
      .catch((err) => setHiringManagersError(apiErrorMessage(err, 'Could not load hiring managers')));
  }, []);

  const handleSubmit = async () => {
    const slots = [slot1, slot2].filter(Boolean).map((s) => new Date(s).toISOString());
    if (!hiringManagerId || slots.length === 0) {
      toast.error('Missing details', 'A hiring manager and at least one time slot are required.');
      return;
    }
    setSaving(true);
    try {
      await interviewsApi.propose({
        applicationId: application.id,
        hiringManagerId,
        type,
        proposedSlots: slots,
      });
      toast.success('Interview proposed', 'The candidate can now respond from their applications list.');
      onClose();
    } catch (err) {
      toast.error('Could not propose interview', apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Propose Interview Slots"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={saving}
            icon="send"
            disabled={!hiringManagerId}
          >
            Propose
          </Button>
        </>
      }
    >
      <div className="space-y-md">
        {hiringManagersError && <p className="text-error text-body-md">{hiringManagersError}</p>}
        {hiringManagers && hiringManagers.length === 0 && !hiringManagersError && (
          <p className="text-body-md text-on-surface-variant">
            No hiring managers are set up yet — ask an admin to add one before scheduling.
          </p>
        )}
        {hiringManagers && hiringManagers.length > 0 && (
          <Select
            label="Hiring Manager"
            value={hiringManagerId}
            onChange={(e) => setHiringManagerId(e.target.value)}
          >
            {hiringManagers.map((hm) => (
              <option key={hm.id} value={hm.id}>
                {hm.name} ({hm.email})
              </option>
            ))}
          </Select>
        )}
        <Select label="Interview Type" value={type} onChange={(e) => setType(e.target.value as InterviewType)}>
          <option value={InterviewType.TECHNICAL}>Technical</option>
          <option value={InterviewType.BEHAVIOURAL}>Behavioural</option>
          <option value={InterviewType.FINAL}>Final</option>
        </Select>
        <Input label="Proposed Slot 1" type="datetime-local" value={slot1} onChange={(e) => setSlot1(e.target.value)} />
        <Input label="Proposed Slot 2 (optional)" type="datetime-local" value={slot2} onChange={(e) => setSlot2(e.target.value)} />
      </div>
    </Modal>
  );
}
