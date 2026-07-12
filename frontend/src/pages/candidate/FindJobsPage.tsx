import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { jobsApi } from '../../api/jobs';
import { apiErrorMessage } from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { Select } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { JobType, type JobPosting } from '../../types';

const TYPE_LABEL: Record<JobType, string> = {
  [JobType.FULL_TIME]: 'Full-time',
  [JobType.PART_TIME]: 'Part-time',
  [JobType.CONTRACT]: 'Contract',
};

export function FindJobsPage() {
  const [jobs, setJobs] = useState<JobPosting[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<JobType | ''>('');

  const load = () => {
    setError(null);
    setJobs(null);
    jobsApi
      .listPublished()
      .then(setJobs)
      .catch((err) => setError(apiErrorMessage(err, 'Could not load job postings')));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!jobs) return [];
    return jobs.filter((job) => {
      const matchesSearch =
        !search ||
        job.title.toLowerCase().includes(search.toLowerCase()) ||
        job.department.toLowerCase().includes(search.toLowerCase()) ||
        job.requiredSkills.some((s) => s.toLowerCase().includes(search.toLowerCase()));
      const matchesType = !typeFilter || job.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [jobs, search, typeFilter]);

  return (
    <div className="space-y-lg">
      <PageHeader title="Find Your Next Role" subtitle="Browse open positions matched to your skills." />

      <div className="flex flex-col md:flex-row gap-md">
        <div className="flex-1 relative">
          <span className="absolute left-md top-1/2 -translate-y-1/2 text-outline">
            <Icon name="search" />
          </span>
          <input
            className="w-full pl-[44px] pr-md py-sm bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-body-md"
            placeholder="Search by title, department, or skill..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as JobType | '')}
          className="md:w-56"
        >
          <option value="">All job types</option>
          {Object.values(JobType).map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t]}
            </option>
          ))}
        </Select>
      </div>

      {jobs === null && !error && <LoadingState label="Loading open roles…" />}
      {error && <ErrorState message={error} onRetry={load} />}
      {jobs && filtered.length === 0 && (
        <EmptyState
          icon="work_off"
          title="No matching jobs"
          description="Try a different search term or clear your filters."
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-lg">
        {filtered.map((job) => (
          <Link key={job.id} to={`/candidate/jobs/${job.id}`}>
            <Card hoverable className="p-lg h-full flex flex-col gap-sm">
              <div className="flex justify-between items-start gap-xs">
                <h3 className="text-title-md font-title-md text-on-surface">{job.title}</h3>
                <span className="shrink-0 text-label-sm bg-surface-container-high text-on-surface-variant px-sm py-[2px] rounded-full">
                  {TYPE_LABEL[job.type]}
                </span>
              </div>
              <p className="text-body-md text-on-surface-variant">{job.department}</p>
              <p className="text-body-md text-on-surface-variant">
                ${job.salaryBandMin.toLocaleString()} – ${job.salaryBandMax.toLocaleString()}
              </p>
              <div className="flex flex-wrap gap-xs mt-xs">
                {job.requiredSkills.slice(0, 4).map((skill) => (
                  <span
                    key={skill}
                    className="text-label-sm bg-primary-fixed text-on-primary-fixed-variant px-sm py-[2px] rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              <span className="mt-auto pt-sm text-primary text-label-sm font-semibold flex items-center gap-xs">
                View details <Icon name="arrow_forward" size={16} />
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
