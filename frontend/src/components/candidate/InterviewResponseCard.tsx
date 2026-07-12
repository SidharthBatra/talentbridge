import { useEffect, useState } from 'react';
import { apiErrorMessage } from '../../api/client';
import { interviewsApi } from '../../api/interviews';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { InterviewStatusBadge } from '../ui/Badge';
import { toast } from '../../store/toastStore';
import { InterviewStatus, type Interview } from '../../types';

/** Given a known interview id, lets the candidate confirm a slot or ask for alternatives. */
export function InterviewResponseCard({ interviewId }: { interviewId: string }) {
  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    interviewsApi
      .get(interviewId)
      .then(setInterview)
      .catch((err) => setError(apiErrorMessage(err, 'Interview not found')))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [interviewId]);

  const confirm = async (slot: string) => {
    setActing(true);
    try {
      const updated = await interviewsApi.confirm(interviewId, slot);
      setInterview(updated);
      toast.success('Interview confirmed', new Date(slot).toLocaleString());
    } catch (err) {
      toast.error('Could not confirm slot', apiErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  const requestAlternatives = async () => {
    setActing(true);
    try {
      const updated = await interviewsApi.requestAlternatives(interviewId);
      setInterview(updated);
      toast.info('Alternatives requested', 'The recruiter will propose new times.');
    } catch (err) {
      toast.error('Could not request alternatives', apiErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  if (loading) return <p className="text-body-md text-on-surface-variant">Loading interview…</p>;
  if (error) return <p className="text-error text-body-md">{error}</p>;
  if (!interview) return null;

  return (
    <div className="border border-outline-variant rounded-lg p-md space-y-sm">
      <div className="flex items-center justify-between">
        <span className="text-body-md font-semibold text-on-surface capitalize">
          {interview.type} interview
        </span>
        <InterviewStatusBadge status={interview.status} />
      </div>

      {interview.status === InterviewStatus.PROPOSED && interview.proposedSlots.length > 0 && (
        <div className="space-y-xs">
          <p className="text-label-sm text-on-surface-variant">Proposed times — pick one:</p>
          {interview.proposedSlots.map((slot) => (
            <div key={slot} className="flex items-center justify-between gap-sm">
              <span className="text-body-md text-on-surface flex items-center gap-xs">
                <Icon name="event" size={16} className="text-outline" />
                {new Date(slot).toLocaleString()}
              </span>
              <Button size="sm" onClick={() => confirm(slot)} disabled={acting}>
                Confirm
              </Button>
            </div>
          ))}
          <Button size="sm" variant="ghost" onClick={requestAlternatives} disabled={acting}>
            None of these work
          </Button>
        </div>
      )}

      {interview.status === InterviewStatus.CONFIRMED && interview.confirmedSlot && (
        <p className="text-body-md text-secondary flex items-center gap-xs">
          <Icon name="check_circle" filled size={18} />
          Confirmed for {new Date(interview.confirmedSlot).toLocaleString()}
        </p>
      )}

      {interview.status === InterviewStatus.CANCELLED && (
        <p className="text-body-md text-error">This interview was cancelled.</p>
      )}
    </div>
  );
}
