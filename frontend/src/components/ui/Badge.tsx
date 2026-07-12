import type { ReactNode } from 'react';
import {
  ApplicationStage,
  InterviewStatus,
  JobStatus,
  OfferStatus,
} from '../../types';

type Tone = 'success' | 'warning' | 'info' | 'neutral' | 'error' | 'primary';

const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-secondary-container text-on-secondary-container',
  warning: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  info: 'bg-primary-fixed text-on-primary-fixed-variant',
  neutral: 'bg-surface-container-high text-on-surface-variant',
  error: 'bg-error-container text-on-error-container',
  primary: 'bg-primary text-on-primary',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center px-sm py-[2px] rounded-full text-label-sm font-label-sm whitespace-nowrap ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

const JOB_STATUS_TONE: Record<JobStatus, Tone> = {
  [JobStatus.DRAFT]: 'neutral',
  [JobStatus.PUBLISHED]: 'success',
  [JobStatus.CLOSED]: 'warning',
  [JobStatus.ARCHIVED]: 'error',
};

const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  [JobStatus.DRAFT]: 'Draft',
  [JobStatus.PUBLISHED]: 'Published',
  [JobStatus.CLOSED]: 'Closed',
  [JobStatus.ARCHIVED]: 'Archived',
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <Badge tone={JOB_STATUS_TONE[status]}>{JOB_STATUS_LABEL[status]}</Badge>;
}

const STAGE_TONE: Record<ApplicationStage, Tone> = {
  [ApplicationStage.APPLIED]: 'neutral',
  [ApplicationStage.SCREENED]: 'info',
  [ApplicationStage.SHORTLISTED]: 'info',
  [ApplicationStage.INTERVIEW_SCHEDULED]: 'warning',
  [ApplicationStage.OFFER]: 'warning',
  [ApplicationStage.HIRED]: 'success',
  [ApplicationStage.REJECTED]: 'error',
};

export const STAGE_LABEL: Record<ApplicationStage, string> = {
  [ApplicationStage.APPLIED]: 'Applied',
  [ApplicationStage.SCREENED]: 'Screened',
  [ApplicationStage.SHORTLISTED]: 'Shortlisted',
  [ApplicationStage.INTERVIEW_SCHEDULED]: 'Interview Scheduled',
  [ApplicationStage.OFFER]: 'Offer Extended',
  [ApplicationStage.HIRED]: 'Hired',
  [ApplicationStage.REJECTED]: 'Rejected',
};

export function StageBadge({ stage }: { stage: ApplicationStage }) {
  return <Badge tone={STAGE_TONE[stage]}>{STAGE_LABEL[stage]}</Badge>;
}

const OFFER_TONE: Record<OfferStatus, Tone> = {
  [OfferStatus.DRAFT]: 'neutral',
  [OfferStatus.SENT]: 'info',
  [OfferStatus.ACCEPTED]: 'success',
  [OfferStatus.REJECTED]: 'error',
  [OfferStatus.NEGOTIATING]: 'warning',
};

export function OfferStatusBadge({ status }: { status: OfferStatus }) {
  return <Badge tone={OFFER_TONE[status]}>{status[0].toUpperCase() + status.slice(1)}</Badge>;
}

const INTERVIEW_TONE: Record<InterviewStatus, Tone> = {
  [InterviewStatus.PROPOSED]: 'warning',
  [InterviewStatus.CONFIRMED]: 'success',
  [InterviewStatus.CANCELLED]: 'error',
};

export function InterviewStatusBadge({ status }: { status: InterviewStatus }) {
  return <Badge tone={INTERVIEW_TONE[status]}>{status[0].toUpperCase() + status.slice(1)}</Badge>;
}
