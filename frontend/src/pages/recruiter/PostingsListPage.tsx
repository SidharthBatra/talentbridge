import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiErrorMessage } from '../../api/client';
import { jobsApi } from '../../api/jobs';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { JobStatusBadge } from '../../components/ui/Badge';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { JobStatus, type JobPosting } from '../../types';

const STATUS_TABS: { value: JobStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: JobStatus.DRAFT, label: 'Draft' },
  { value: JobStatus.PUBLISHED, label: 'Published' },
  { value: JobStatus.CLOSED, label: 'Closed' },
  { value: JobStatus.ARCHIVED, label: 'Archived' },
];

export function PostingsListPage() {
  const [jobs, setJobs] = useState<JobPosting[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<JobStatus | 'all'>('all');

  const load = () => {
    setError(null);
    jobsApi
      .listInternal()
      .then(setJobs)
      .catch((err) => setError(apiErrorMessage(err, 'Could not load job postings')));
  };

  useEffect(load, []);

  const filtered = useMemo(
    () => (jobs ?? []).filter((j) => tab === 'all' || j.status === tab),
    [jobs, tab],
  );

  return (
    <div className="space-y-lg">
      <PageHeader
        title="Job Postings"
        subtitle="Track, manage, and optimize your hiring pipeline."
        action={
          <Link to="/recruiter/jobs/new">
            <Button icon="add_circle">Post New Job</Button>
          </Link>
        }
      />

      <div className="flex items-center gap-xs bg-surface-container p-xs rounded-lg border border-outline-variant w-fit overflow-x-auto">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-md py-xs rounded-md text-body-md whitespace-nowrap transition-colors ${
              tab === t.value
                ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {jobs === null && !error && <LoadingState label="Loading postings…" />}
      {error && <ErrorState message={error} onRetry={load} />}
      {jobs && filtered.length === 0 && (
        <EmptyState
          icon="work_off"
          title="No postings here"
          description="Create a job posting to start building your pipeline."
          action={
            <Link to="/recruiter/jobs/new">
              <Button icon="add_circle">Post New Job</Button>
            </Link>
          }
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-lg">
        {filtered.map((job) => (
          <Card key={job.id} hoverable className="overflow-hidden flex flex-col">
            <div
              className={`h-1 w-full ${job.status === JobStatus.PUBLISHED ? 'bg-secondary' : 'bg-outline-variant'}`}
            />
            <div className="p-lg space-y-sm flex-1 flex flex-col">
              <div className="flex justify-between items-start gap-xs">
                <JobStatusBadge status={job.status} />
              </div>
              <h3 className="text-title-md font-title-md text-on-surface">{job.title}</h3>
              <p className="text-body-md text-on-surface-variant">{job.department}</p>
              <p className="text-body-md text-on-surface-variant">
                ${job.salaryBandMin.toLocaleString()} – ${job.salaryBandMax.toLocaleString()}
              </p>
              <div className="flex gap-sm mt-auto pt-sm">
                <Link to={`/recruiter/jobs/${job.id}/edit`} className="flex-1">
                  <Button variant="secondary" size="sm" className="w-full" icon="edit">
                    Edit
                  </Button>
                </Link>
                <Link to={`/recruiter/jobs/${job.id}/applications`} className="flex-1">
                  <Button size="sm" className="w-full" icon="groups">
                    Applicants
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
