import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { applicationsApi } from '../../api/applications';
import { apiErrorMessage } from '../../api/client';
import { jobsApi } from '../../api/jobs';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { Input, Textarea } from '../../components/ui/Input';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { toast } from '../../store/toastStore';
import { JobType, type Application, type JobPosting } from '../../types';

const TYPE_LABEL: Record<JobType, string> = {
  [JobType.FULL_TIME]: 'Full-time',
  [JobType.PART_TIME]: 'Part-time',
  [JobType.CONTRACT]: 'Contract',
};

const MAX_CV_BYTES = 5 * 1024 * 1024;

export function JobDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [applying, setApplying] = useState(false);
  const [submitted, setSubmitted] = useState<Application | null>(null);
  const [form, setForm] = useState({
    coverLetter: '',
    yearsOfExperience: '',
    salaryExpectation: '',
    availabilityDate: '',
  });
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvError, setCvError] = useState<string | null>(null);
  const [uploadingCv, setUploadingCv] = useState(false);

  useEffect(() => {
    if (!id) return;
    jobsApi
      .getPublished(id)
      .then(setJob)
      .catch((err) => setError(apiErrorMessage(err, 'Job not found or no longer published')));
  }, [id]);

  const handleApply = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmitError(null);
    setApplying(true);
    try {
      const application = await applicationsApi.create({
        jobPostingId: id,
        coverLetter: form.coverLetter || undefined,
        yearsOfExperience: Number(form.yearsOfExperience),
        salaryExpectation: form.salaryExpectation ? Number(form.salaryExpectation) : undefined,
        availabilityDate: form.availabilityDate || undefined,
      });
      setSubmitted(application);
      toast.success('Application submitted', 'Add your CV to strengthen your application.');
    } catch (err) {
      setSubmitError(apiErrorMessage(err, 'Could not submit your application'));
    } finally {
      setApplying(false);
    }
  };

  const validateCvFile = (file: File): string | null => {
    if (file.type !== 'application/pdf') return 'Only PDF files are accepted.';
    if (file.size > MAX_CV_BYTES) return 'File must be 5MB or smaller.';
    return null;
  };

  const handleCvChange = (file: File | null) => {
    setCvError(null);
    if (!file) {
      setCvFile(null);
      return;
    }
    const validationError = validateCvFile(file);
    if (validationError) {
      setCvError(validationError);
      setCvFile(null);
      return;
    }
    setCvFile(file);
  };

  const handleUploadCv = async () => {
    if (!submitted || !cvFile) return;
    setUploadingCv(true);
    setCvError(null);
    try {
      await applicationsApi.uploadCv(submitted.id, cvFile);
      toast.success('CV uploaded', 'Your resume has been attached to this application.');
      navigate('/candidate/applications');
    } catch (err) {
      setCvError(apiErrorMessage(err, 'CV upload failed'));
    } finally {
      setUploadingCv(false);
    }
  };

  if (error) return <ErrorState message={error} />;
  if (!job) return <LoadingState label="Loading job…" />;

  return (
    <div className="max-w-3xl space-y-lg">
      <Card className="p-lg space-y-md">
        <div className="flex justify-between items-start gap-md">
          <div>
            <h1 className="text-headline-lg-mobile font-headline-lg-mobile text-on-surface">{job.title}</h1>
            <p className="text-body-lg text-on-surface-variant mt-xs">{job.department}</p>
          </div>
          <span className="shrink-0 text-label-sm bg-surface-container-high text-on-surface-variant px-sm py-xs rounded-full">
            {TYPE_LABEL[job.type]}
          </span>
        </div>

        <p className="text-body-lg text-on-surface font-semibold">
          ${job.salaryBandMin.toLocaleString()} – ${job.salaryBandMax.toLocaleString()} / year
        </p>

        <div className="flex flex-wrap gap-xs">
          {job.requiredSkills.map((skill) => (
            <span
              key={skill}
              className="text-label-sm bg-primary-fixed text-on-primary-fixed-variant px-sm py-[2px] rounded-full"
            >
              {skill}
            </span>
          ))}
        </div>

        <div>
          <h3 className="text-title-md font-title-md text-on-surface mb-xs">Responsibilities</h3>
          <p className="text-body-md text-on-surface-variant whitespace-pre-line">
            {job.responsibilities}
          </p>
        </div>

        {job.cultureNotes && (
          <div>
            <h3 className="text-title-md font-title-md text-on-surface mb-xs">Culture</h3>
            <p className="text-body-md text-on-surface-variant whitespace-pre-line">
              {job.cultureNotes}
            </p>
          </div>
        )}
      </Card>

      {!submitted ? (
        <Card className="p-lg space-y-md">
          <h2 className="text-title-md font-title-md text-on-surface">Apply for this role</h2>
          <form className="space-y-md" onSubmit={handleApply}>
            <Textarea
              label="Cover Letter (optional)"
              placeholder="Tell us why you're a great fit..."
              value={form.coverLetter}
              onChange={(e) => setForm({ ...form, coverLetter: e.target.value })}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <Input
                label="Years of Experience"
                type="number"
                min={0}
                required
                value={form.yearsOfExperience}
                onChange={(e) => setForm({ ...form, yearsOfExperience: e.target.value })}
              />
              <Input
                label="Salary Expectation (optional)"
                type="number"
                min={0}
                value={form.salaryExpectation}
                onChange={(e) => setForm({ ...form, salaryExpectation: e.target.value })}
              />
            </div>
            <Input
              label="Availability Date (optional)"
              type="date"
              value={form.availabilityDate}
              onChange={(e) => setForm({ ...form, availabilityDate: e.target.value })}
            />
            {submitError && <p className="text-error text-body-md">{submitError}</p>}
            <Button type="submit" loading={applying} icon="send">
              Submit Application
            </Button>
          </form>
        </Card>
      ) : (
        <Card className="p-lg space-y-md">
          <div className="flex items-center gap-xs text-secondary">
            <Icon name="check_circle" filled />
            <h2 className="text-title-md font-title-md text-on-surface">Application submitted</h2>
          </div>
          <p className="text-body-md text-on-surface-variant">
            Upload your CV (PDF, max 5MB) to help us extract your skills and experience.
          </p>
          <label className="flex flex-col items-center justify-center gap-xs border-2 border-dashed border-outline-variant rounded-lg py-lg cursor-pointer hover:border-primary transition-colors">
            <Icon name="upload_file" className="text-outline" size={32} />
            <span className="text-body-md text-on-surface-variant">
              {cvFile ? cvFile.name : 'Click to choose a PDF file'}
            </span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => handleCvChange(e.target.files?.[0] ?? null)}
            />
          </label>
          {cvError && <p className="text-error text-body-md">{cvError}</p>}
          <div className="flex gap-sm">
            <Button onClick={handleUploadCv} disabled={!cvFile} loading={uploadingCv} icon="upload">
              Upload CV
            </Button>
            <Button variant="ghost" onClick={() => navigate('/candidate/applications')}>
              Skip for now
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
