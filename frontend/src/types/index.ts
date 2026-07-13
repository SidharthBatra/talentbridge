/**
 * Mirrors the backend API contract 1:1 (enums, entities, DTOs). See
 * backend/src/common/enums, backend/src/modules/*\/entities,
 * backend/src/modules/*\/dto for the source of truth.
 */

// ---- Enums -----------------------------------------------------------------

export enum Role {
  CANDIDATE = 'CANDIDATE',
  RECRUITER = 'RECRUITER',
  HIRING_MANAGER = 'HIRING_MANAGER',
  ADMIN = 'ADMIN',
}

export enum JobType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
}

export enum JobStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
}

export enum ApplicationStage {
  APPLIED = 'applied',
  SCREENED = 'screened',
  SHORTLISTED = 'shortlisted',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  OFFER = 'offer',
  HIRED = 'hired',
  REJECTED = 'rejected',
}

export enum InterviewType {
  TECHNICAL = 'technical',
  BEHAVIOURAL = 'behavioural',
  FINAL = 'final',
}

export enum InterviewStatus {
  PROPOSED = 'proposed',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

export enum OfferStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  NEGOTIATING = 'negotiating',
}

// ---- Auth -------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  companyId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// ---- Job postings -------------------------------------------------------------

export interface JobPosting {
  id: string;
  title: string;
  department: string;
  type: JobType;
  salaryBandMin: number;
  salaryBandMax: number;
  requiredSkills: string[];
  responsibilities: string;
  cultureNotes: string | null;
  status: JobStatus;
  createdBy: string;
  createdAt: string;
}

export interface PipelineStageCounts {
  applied: number;
  screened: number;
  shortlisted: number;
  interview_scheduled: number;
  offer: number;
  hired: number;
  rejected: number;
}

export interface JobPostingStats {
  jobPostingId: string;
  totalApplications: number;
  stageCounts: PipelineStageCounts;
  daysOpen: number;
}

export interface CreateJobPostingInput {
  title: string;
  department: string;
  type: JobType;
  salaryBandMin: number;
  salaryBandMax: number;
  requiredSkills: string[];
  responsibilities: string;
  cultureNotes?: string;
}

// ---- Applications ---------------------------------------------------------

export interface Application {
  id: string;
  jobPostingId: string;
  candidateId: string;
  cvUrl: string | null;
  cvExtractedText: string | null;
  coverLetter: string | null;
  yearsOfExperience: number;
  salaryExpectation: number | null;
  availabilityDate: string | null;
  stage: ApplicationStage;
  aiScore: number | null;
  aiStrengths: string[] | null;
  aiGaps: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApplicationInput {
  jobPostingId: string;
  coverLetter?: string;
  yearsOfExperience: number;
  salaryExpectation?: number;
  availabilityDate?: string;
}

export interface ApplicationQuery {
  jobId?: string;
  stage?: ApplicationStage;
  sortBy?: 'createdAt' | 'updatedAt' | 'aiScore';
}

export interface BulkActionResult {
  succeeded: string[];
  failed: { id: string; reason: string }[];
}

// ---- Interviews -----------------------------------------------------------

export interface InterviewQuestion {
  question: string;
  listenFor: string;
}

export interface Interview {
  id: string;
  applicationId: string;
  proposedSlots: string[];
  confirmedSlot: string | null;
  type: InterviewType;
  hiringManagerId: string;
  status: InterviewStatus;
  createdAt: string;
  reminderSentAt?: string | null;
  questions?: InterviewQuestion[] | null;
}

export interface ProposeInterviewInput {
  applicationId: string;
  hiringManagerId: string;
  type: InterviewType;
  proposedSlots: string[];
}

// ---- Offers -----------------------------------------------------------------

export interface Offer {
  id: string;
  applicationId: string;
  salary: number;
  startDate: string;
  benefits: string[];
  letterText: string | null;
  status: OfferStatus;
  counterOffer: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOfferInput {
  applicationId: string;
  salary: number;
  startDate: string;
  benefits?: string[];
  letterText?: string;
}

export type OfferResponseAction = 'accepted' | 'rejected' | 'negotiating';

// ---- AI -----------------------------------------------------------------------

export interface GenerateJobDescriptionInput {
  jobTitle: string;
  department: string;
  requiredSkills: string[];
  level: 'junior' | 'mid' | 'senior';
  cultureNotes?: string;
}

export interface JobDescriptionResult {
  roleSummary: string;
  keyResponsibilities: string[];
  requiredQualifications: string[];
  preferredQualifications: string[];
  whatWeOffer: string[];
  isFallback: boolean;
}

export interface CvScoreResult {
  scored: boolean;
  candidateName?: string;
  yearsOfExperience?: number;
  topSkills?: string[];
  educationLevel?: string;
  lastRole?: string;
  matchScore?: number;
  topStrengths?: string[];
  topGaps?: string[];
  message?: string;
}

export interface InterviewQuestionsResult {
  questions: InterviewQuestion[];
  isFallback: boolean;
}

export interface GenerateOfferLetterInput {
  candidateName: string;
  roleTitle: string;
  salary: number;
  startDate: string;
  probationPeriod: string;
  benefits: string[];
  companyName: string;
}

export interface OfferLetterResult {
  letterText: string;
  isFallback: boolean;
}

// ---- WebSocket events -------------------------------------------------------

export interface ApplicationStageChangedEvent {
  applicationId: string;
  stage: ApplicationStage;
}

export interface InterviewReminderEvent {
  interviewId: string;
  applicationId: string;
  confirmedSlot: string;
}

export interface OfferRespondedEvent {
  offerId: string;
  applicationId: string;
  response: OfferResponseAction;
}

// ---- Misc -----------------------------------------------------------------

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}
