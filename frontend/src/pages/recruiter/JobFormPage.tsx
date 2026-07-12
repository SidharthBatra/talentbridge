import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { aiApi } from '../../api/ai';
import { apiErrorMessage } from '../../api/client';
import { jobsApi } from '../../api/jobs';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { JobStatusBadge } from '../../components/ui/Badge';
import { LoadingState } from '../../components/ui/States';
import { toast } from '../../store/toastStore';
import { JobStatus, JobType, type CreateJobPostingInput } from '../../types';

const TYPE_LABEL: Record<JobType, string> = {
  [JobType.FULL_TIME]: 'Full-time',
  [JobType.PART_TIME]: 'Part-time',
  [JobType.CONTRACT]: 'Contract',
};

const LEVELS = ['junior', 'mid', 'senior'] as const;

const STATUS_NEXT: Partial<Record<JobStatus, JobStatus>> = {
  [JobStatus.DRAFT]: JobStatus.PUBLISHED,
  [JobStatus.PUBLISHED]: JobStatus.CLOSED,
  [JobStatus.CLOSED]: JobStatus.ARCHIVED,
};
const STATUS_NEXT_LABEL: Partial<Record<JobStatus, string>> = {
  [JobStatus.DRAFT]: 'Publish',
  [JobStatus.PUBLISHED]: 'Close',
  [JobStatus.CLOSED]: 'Archive',
};

const emptyForm: CreateJobPostingInput = {
  title: '',
  department: '',
  type: JobType.FULL_TIME,
  salaryBandMin: 0,
  salaryBandMax: 0,
  requiredSkills: [],
  responsibilities: '',
  cultureNotes: '',
};

export function JobFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState<CreateJobPostingInput>(emptyForm);
  const [skillsInput, setSkillsInput] = useState('');
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [level, setLevel] = useState<(typeof LEVELS)[number]>('mid');
  const [generating, setGenerating] = useState(false);
  const [aiFallback, setAiFallback] = useState(false);

  useEffect(() => {
    if (!id) return;
    jobsApi
      .get(id)
      .then((job) => {
        setForm({
          title: job.title,
          department: job.department,
          type: job.type,
          salaryBandMin: job.salaryBandMin,
          salaryBandMax: job.salaryBandMax,
          requiredSkills: job.requiredSkills,
          responsibilities: job.responsibilities,
          cultureNotes: job.cultureNotes ?? '',
        });
        setSkillsInput(job.requiredSkills.join(', '));
        setStatus(job.status);
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load this job posting')))
      .finally(() => setLoading(false));
  }, [id]);

  const parsedSkills = () =>
    skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  const handleGenerate = async () => {
    const skills = parsedSkills();
    if (!form.title || !form.department || skills.length < 3) {
      toast.error(
        'More detail needed',
        'Enter a title, department, and at least 3 required skills before generating.',
      );
      return;
    }
    setGenerating(true);
    setAiFallback(false);
    try {
      const result = await aiApi.generateJobDescription({
        jobTitle: form.title,
        department: form.department,
        requiredSkills: skills.slice(0, 5),
        level,
        cultureNotes: form.cultureNotes || undefined,
      });
      setAiFallback(result.isFallback);
      const responsibilities = [
        result.roleSummary,
        '',
        'Key Responsibilities:',
        ...result.keyResponsibilities.map((r) => `• ${r}`),
        '',
        'Required Qualifications:',
        ...result.requiredQualifications.map((r) => `• ${r}`),
        '',
        'Preferred Qualifications:',
        ...result.preferredQualifications.map((r) => `• ${r}`),
        '',
        'What We Offer:',
        ...result.whatWeOffer.map((r) => `• ${r}`),
      ].join('\n');
      setForm((f) => ({ ...f, responsibilities }));
      if (result.isFallback) {
        toast.info('AI unavailable', 'A placeholder draft was inserted — please edit it.');
      } else {
        toast.success('Draft generated', 'Review and edit before saving.');
      }
    } catch (err) {
      toast.error('Generation failed', apiErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const payload = { ...form, requiredSkills: parsedSkills() };
    try {
      if (isEdit && id) {
        await jobsApi.update(id, payload);
        toast.success('Job posting updated');
      } else {
        const created = await jobsApi.create(payload);
        toast.success('Job posting created', 'It starts as a draft — publish it when ready.');
        navigate(`/recruiter/jobs/${created.id}/edit`, { replace: true });
        return;
      }
      navigate('/recruiter/jobs');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save this job posting'));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusTransition = async () => {
    if (!id || !status) return;
    const next = STATUS_NEXT[status];
    if (!next) return;
    try {
      const updated = await jobsApi.updateStatus(id, next);
      setStatus(updated.status);
      toast.success(`Job posting ${STATUS_NEXT_LABEL[status]?.toLowerCase()}ed`);
    } catch (err) {
      toast.error('Status change failed', apiErrorMessage(err));
    }
  };

  if (loading) return <LoadingState label="Loading job posting…" />;

  return (
    <div className="max-w-3xl space-y-lg">
      <PageHeader
        title={isEdit ? 'Edit Job Posting' : 'New Job Posting'}
        subtitle={isEdit ? 'Update details or transition its status.' : 'Fill in the details below.'}
        action={
          isEdit && status ? (
            <div className="flex items-center gap-sm">
              <JobStatusBadge status={status} />
              {STATUS_NEXT[status] && (
                <Button variant="secondary" size="sm" onClick={handleStatusTransition}>
                  {STATUS_NEXT_LABEL[status]}
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      <Card className="p-lg space-y-md">
        <form className="space-y-md" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <Input
              label="Job Title"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <Input
              label="Department"
              required
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            <Select
              label="Type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as JobType })}
            >
              {Object.values(JobType).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
            <Input
              label="Salary Band Min"
              type="number"
              min={0}
              required
              value={form.salaryBandMin}
              onChange={(e) => setForm({ ...form, salaryBandMin: Number(e.target.value) })}
            />
            <Input
              label="Salary Band Max"
              type="number"
              min={0}
              required
              value={form.salaryBandMax}
              onChange={(e) => setForm({ ...form, salaryBandMax: Number(e.target.value) })}
            />
          </div>

          <Input
            label="Required Skills (comma-separated, 3-5 for AI generation)"
            required
            placeholder="TypeScript, NestJS, PostgreSQL"
            value={skillsInput}
            onChange={(e) => setSkillsInput(e.target.value)}
          />

          <Textarea
            label="Culture Notes (optional)"
            value={form.cultureNotes}
            onChange={(e) => setForm({ ...form, cultureNotes: e.target.value })}
          />

          <div className="border border-primary/30 rounded-lg p-md space-y-sm bg-primary-fixed/20">
            <div className="flex items-center justify-between flex-wrap gap-sm">
              <div className="flex items-center gap-xs text-primary">
                <Icon name="auto_awesome" filled />
                <span className="text-body-md font-semibold">Generate with AI</span>
              </div>
              <div className="flex items-center gap-sm">
                <Select value={level} onChange={(e) => setLevel(e.target.value as typeof level)} className="!py-xs">
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l[0].toUpperCase() + l.slice(1)}
                    </option>
                  ))}
                </Select>
                <Button type="button" variant="ai" size="sm" onClick={handleGenerate} loading={generating}>
                  Generate
                </Button>
              </div>
            </div>
            {aiFallback && (
              <p className="text-label-sm text-tertiary-container">
                AI was unavailable — a placeholder draft was inserted below for manual editing.
              </p>
            )}
            <Textarea
              label="Responsibilities & Description"
              required
              rows={12}
              value={form.responsibilities}
              onChange={(e) => setForm({ ...form, responsibilities: e.target.value })}
            />
          </div>

          {error && <p className="text-error text-body-md">{error}</p>}

          <div className="flex gap-sm">
            <Button type="submit" loading={saving} icon="save">
              {isEdit ? 'Save Changes' : 'Create Draft'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate('/recruiter/jobs')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
