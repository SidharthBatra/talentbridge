import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiErrorMessage } from '../../api/client';
import { jobsApi } from '../../api/jobs';
import { applicationsApi } from '../../api/applications';
import { Card } from '../../components/ui/Card';
import { MetricCard } from '../../components/ui/MetricCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { ApplicationStage, type Application, type JobPosting } from '../../types';

const STAGE_ORDER = [
  ApplicationStage.APPLIED,
  ApplicationStage.SCREENED,
  ApplicationStage.SHORTLISTED,
  ApplicationStage.INTERVIEW_SCHEDULED,
  ApplicationStage.OFFER,
  ApplicationStage.HIRED,
  ApplicationStage.REJECTED,
];
const STAGE_LABEL: Record<ApplicationStage, string> = {
  [ApplicationStage.APPLIED]: 'Applied',
  [ApplicationStage.SCREENED]: 'Screened',
  [ApplicationStage.SHORTLISTED]: 'Shortlisted',
  [ApplicationStage.INTERVIEW_SCHEDULED]: 'Interview',
  [ApplicationStage.OFFER]: 'Offer',
  [ApplicationStage.HIRED]: 'Hired',
  [ApplicationStage.REJECTED]: 'Rejected',
};

const CHART_COLORS = ['#142175', '#4b57aa', '#006c49', '#4edea3', '#f29c06', '#ba1a1a', '#767682'];

export function AnalyticsPage() {
  const [jobs, setJobs] = useState<JobPosting[] | null>(null);
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    Promise.all([jobsApi.listInternal(), applicationsApi.list()])
      .then(([j, a]) => {
        setJobs(j);
        setApplications(a);
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load analytics data')));
  };

  useEffect(load, []);

  const funnelData = useMemo(() => {
    if (!applications) return [];
    return STAGE_ORDER.map((stage) => ({
      stage: STAGE_LABEL[stage],
      count: applications.filter((a) => a.stage === stage).length,
    }));
  }, [applications]);

  const jobsById = useMemo(
    () => Object.fromEntries((jobs ?? []).map((j) => [j.id, j])),
    [jobs],
  );

  // Time-to-hire: for HIRED applications, days between createdAt and
  // updatedAt (the API has no dedicated hiredAt timestamp, so updatedAt —
  // set on every stage transition — is the closest real signal for when
  // the hire decision landed).
  const timeToHireData = useMemo(() => {
    if (!applications) return [];
    const hired = applications.filter((a) => a.stage === ApplicationStage.HIRED);
    const byRole = new Map<string, number[]>();
    for (const app of hired) {
      const days = Math.max(
        0,
        Math.round(
          (new Date(app.updatedAt).getTime() - new Date(app.createdAt).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );
      const roleTitle = jobsById[app.jobPostingId]?.title ?? 'Unknown role';
      byRole.set(roleTitle, [...(byRole.get(roleTitle) ?? []), days]);
    }
    return Array.from(byRole.entries()).map(([role, days]) => ({
      role,
      avgDays: Math.round(days.reduce((s, d) => s + d, 0) / days.length),
    }));
  }, [applications, jobsById]);

  // Offer-stage outcomes: the API has no `GET /offers` list endpoint, so
  // this is a proxy built from Application.stage — of everyone who reached
  // the OFFER stage, how many ended HIRED vs REJECTED vs still pending.
  const offerOutcomeData = useMemo(() => {
    if (!applications) return [];
    const reachedOffer = applications.filter((a) =>
      [ApplicationStage.OFFER, ApplicationStage.HIRED, ApplicationStage.REJECTED].includes(a.stage),
    );
    // Only count rejections that happened after reaching offer stage is not
    // knowable from stage alone, so this counts current-state snapshot:
    const hired = applications.filter((a) => a.stage === ApplicationStage.HIRED).length;
    const pending = applications.filter((a) => a.stage === ApplicationStage.OFFER).length;
    const rejected = reachedOffer.length - hired - pending;
    return [
      { name: 'Hired', value: hired },
      { name: 'Pending Response', value: pending },
      { name: 'Rejected', value: Math.max(0, rejected) },
    ].filter((d) => d.value > 0);
  }, [applications]);

  const applicationsPerJobData = useMemo(() => {
    if (!applications || !jobs) return [];
    return jobs
      .map((job) => ({
        job: job.title.length > 18 ? `${job.title.slice(0, 18)}…` : job.title,
        applications: applications.filter((a) => a.jobPostingId === job.id).length,
      }))
      .filter((d) => d.applications > 0)
      .sort((a, b) => b.applications - a.applications)
      .slice(0, 8);
  }, [applications, jobs]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!jobs || !applications) return <LoadingState label="Crunching numbers…" />;

  const totalHired = applications.filter((a) => a.stage === ApplicationStage.HIRED).length;
  const avgScore = (() => {
    const scored = applications.filter((a) => a.aiScore !== null);
    if (scored.length === 0) return null;
    return Math.round(scored.reduce((s, a) => s + (a.aiScore ?? 0), 0) / scored.length);
  })();

  return (
    <div className="space-y-xl">
      <PageHeader title="Analytics" subtitle="Real-time aggregates across every job posting and application." />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-lg">
        <MetricCard label="Total Job Postings" value={jobs.length} icon="work" />
        <MetricCard label="Total Applications" value={applications.length} icon="description" />
        <MetricCard label="Hired" value={totalHired} icon="check_circle" trend="Across all roles" />
        <MetricCard
          label="Avg. AI Match Score"
          value={avgScore !== null ? `${avgScore}/100` : '—'}
          icon="auto_awesome"
          highlight
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-lg">
        <Card className="p-lg">
          <h3 className="text-title-md font-title-md text-on-surface mb-md">
            Pipeline Funnel — Applications by Stage
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={funnelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#c6c5d3" />
              <XAxis dataKey="stage" tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#142175" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-lg">
          <h3 className="text-title-md font-title-md text-on-surface mb-md">
            Avg. Time-to-Hire by Role (days)
          </h3>
          {timeToHireData.length === 0 ? (
            <p className="text-body-md text-on-surface-variant py-xl text-center">
              No hires recorded yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={timeToHireData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#c6c5d3" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="role" width={140} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="avgDays" fill="#006c49" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-lg">
          <h3 className="text-title-md font-title-md text-on-surface mb-md">Offer Stage Outcomes</h3>
          <p className="text-label-sm text-on-surface-variant mb-sm">
            Proxy based on application stage (no offer-list endpoint exists to use Offer.status directly).
          </p>
          {offerOutcomeData.length === 0 ? (
            <p className="text-body-md text-on-surface-variant py-xl text-center">
              No applications have reached the offer stage yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={offerOutcomeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {offerOutcomeData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-lg">
          <h3 className="text-title-md font-title-md text-on-surface mb-md">
            Applications per Job Posting
          </h3>
          {applicationsPerJobData.length === 0 ? (
            <p className="text-body-md text-on-surface-variant py-xl text-center">No applications yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={applicationsPerJobData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#c6c5d3" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="job" width={140} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="applications" fill="#4b57aa" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
