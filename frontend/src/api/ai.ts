import { apiClient } from './client';
import type {
  CvScoreResult,
  GenerateJobDescriptionInput,
  GenerateOfferLetterInput,
  InterviewQuestion,
  InterviewQuestionsResult,
  JobDescriptionResult,
  OfferLetterResult,
} from '../types';

export const aiApi = {
  generateJobDescription: (input: GenerateJobDescriptionInput) =>
    apiClient
      .post<JobDescriptionResult>('/ai/job-description', input)
      .then((r) => r.data),

  scoreCv: (applicationId: string) =>
    apiClient
      .post<CvScoreResult>(`/ai/cv-score/${applicationId}`)
      .then((r) => r.data),

  generateInterviewQuestions: (
    applicationId: string,
    interviewType: 'technical' | 'behavioural' | 'final',
  ) =>
    apiClient
      .post<InterviewQuestionsResult>('/ai/interview-questions', {
        applicationId,
        interviewType,
      })
      .then((r) => r.data),

  saveInterviewQuestions: (interviewId: string, questions: InterviewQuestion[]) =>
    apiClient
      .patch<{ interviewId: string; questions: InterviewQuestion[] }>(
        `/ai/interview-questions/${interviewId}`,
        { questions },
      )
      .then((r) => r.data),

  generateOfferLetter: (input: GenerateOfferLetterInput) =>
    apiClient.post<OfferLetterResult>('/ai/offer-letter', input).then((r) => r.data),
};
