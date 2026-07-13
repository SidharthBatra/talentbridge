import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Role } from '../src/common/enums/role.enum';
import { JobType } from '../src/common/enums/job-type.enum';
import { AiService } from '../src/modules/ai/ai.service';
import { INTERVIEW_QUESTION_FALLBACKS } from '../src/modules/ai/interview-question-fallbacks';

/**
 * AI proxy e2e coverage (Module 3). `AiService.generateJson` is mocked at
 * the provider level so no real Gemini call ever happens in tests — we
 * control exactly what "the AI" returns per test, including simulated
 * failures, to assert both the success path and every fallback path.
 */
describe('AI proxy (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let generateJson: jest.Mock;
  const api = () => request(app.getHttpServer());

  const unique = Date.now();
  const recruiter = {
    email: `airec_${unique}@acme.com`,
    password: 'RecruitPass1!',
    name: 'Rec',
    role: Role.RECRUITER,
  };
  const candidate = {
    email: `aicand_${unique}@acme.com`,
    password: 'CandPass1!',
    name: 'Cand',
    role: Role.CANDIDATE,
  };
  const hiringManager = {
    email: `aihm_${unique}@acme.com`,
    password: 'HmPass1!',
    name: 'HM',
    role: Role.HIRING_MANAGER,
  };

  let recruiterToken: string;
  let candidateToken: string;
  let hiringManagerUserId: string;
  let jobId: string;
  let applicationId: string;
  let interviewId: string;

  beforeAll(async () => {
    generateJson = jest.fn();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AiService)
      .useValue({ generateJson })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    dataSource = app.get(DataSource);

    recruiterToken = (
      await api().post('/api/auth/register').send(recruiter)
    ).body.accessToken;
    candidateToken = (
      await api().post('/api/auth/register').send(candidate)
    ).body.accessToken;
    hiringManagerUserId = (
      await api().post('/api/auth/register').send(hiringManager)
    ).body.user.id;

    const jobRes = await api()
      .post('/api/jobs')
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({
        title: 'AI Test Role',
        department: 'Engineering',
        type: JobType.FULL_TIME,
        salaryBandMin: 80000,
        salaryBandMax: 110000,
        requiredSkills: ['TypeScript', 'NestJS'],
        responsibilities: 'Build things.',
      });
    jobId = jobRes.body.id;
    await api()
      .patch(`/api/jobs/${jobId}/status`)
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ status: 'published' });

    const appRes = await api()
      .post('/api/applications')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({ jobPostingId: jobId, yearsOfExperience: 4 });
    applicationId = appRes.body.id;

    await dataSource.query(
      `UPDATE applications SET cv_extracted_text = $1 WHERE id = $2`,
      ['Jane Doe. 4 years TypeScript. Senior Engineer at Acme.', applicationId],
    );

    const ivRes = await api()
      .post('/api/interviews')
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({
        applicationId,
        hiringManagerId: hiringManagerUserId,
        type: 'technical',
        proposedSlots: ['2026-09-01T14:00:00.000Z'],
      });
    interviewId = ivRes.body.id;
  });

  afterEach(() => {
    generateJson.mockReset();
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.query(
        `DELETE FROM interviews WHERE application_id IN (SELECT id FROM applications WHERE job_posting_id = $1)`,
        [jobId],
      );
      await dataSource.query(
        `DELETE FROM offers WHERE application_id IN (SELECT id FROM applications WHERE job_posting_id = $1)`,
        [jobId],
      );
      await dataSource.query(
        `DELETE FROM applications WHERE job_posting_id = $1`,
        [jobId],
      );
      await dataSource.query(`DELETE FROM job_postings WHERE id = $1`, [jobId]);
      await dataSource.query(
        `DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%_${unique}@acme.com')`,
      );
      await dataSource.query(
        `DELETE FROM users WHERE email LIKE '%_${unique}@acme.com'`,
      );
    }
    await app?.close();
  });

  describe('POST /ai/job-description', () => {
    const payload = {
      jobTitle: 'Backend Engineer',
      department: 'Engineering',
      requiredSkills: ['TypeScript', 'NestJS', 'PostgreSQL'],
      level: 'mid',
    };

    it('rejects a CANDIDATE (RECRUITER/ADMIN only)', async () => {
      const res = await api()
        .post('/api/ai/job-description')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send(payload);
      expect(res.status).toBe(403);
    });

    it('returns the AI-generated structured JD on success', async () => {
      generateJson.mockResolvedValue({
        ok: true,
        data: {
          roleSummary: 'Own our backend roadmap.',
          keyResponsibilities: ['Ship features', 'Review PRs'],
          requiredQualifications: ['3+ years TypeScript'],
          preferredQualifications: ['NestJS experience'],
          whatWeOffer: ['Remote-first', 'Health insurance'],
        },
      });

      const res = await api()
        .post('/api/ai/job-description')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.isFallback).toBe(false);
      expect(res.body.roleSummary).toBe('Own our backend roadmap.');
      expect(generateJson).toHaveBeenCalledTimes(1);
    });

    it('falls back to a placeholder template when AI fails', async () => {
      generateJson.mockResolvedValue({
        ok: false,
        reason: 'rate_limited',
        message: 'AI service rate limit reached',
      });

      const res = await api()
        .post('/api/ai/job-description')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.isFallback).toBe(true);
      expect(res.body.keyResponsibilities.length).toBeGreaterThan(0);
      expect(res.body.requiredQualifications).toEqual(
        expect.arrayContaining([expect.stringContaining('TypeScript')]),
      );
    });

    it('regenerates on a second call with no special flag (same endpoint)', async () => {
      generateJson.mockResolvedValue({
        ok: true,
        data: {
          roleSummary: 'v2 summary',
          keyResponsibilities: ['a'],
          requiredQualifications: ['b'],
          preferredQualifications: ['c'],
          whatWeOffer: ['d'],
        },
      });
      const res = await api()
        .post('/api/ai/job-description')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send(payload);
      expect(res.body.roleSummary).toBe('v2 summary');
    });
  });

  describe('POST /ai/cv-score/:applicationId', () => {
    it('rejects a CANDIDATE', async () => {
      const res = await api()
        .post(`/api/ai/cv-score/${applicationId}`)
        .set('Authorization', `Bearer ${candidateToken}`);
      expect(res.status).toBe(403);
    });

    it('scores the CV and persists aiScore/aiStrengths/aiGaps onto the application', async () => {
      generateJson.mockResolvedValue({
        ok: true,
        data: {
          candidateName: 'Jane Doe',
          yearsOfExperience: 4,
          topSkills: ['TypeScript', 'NestJS', 'SQL', 'Testing', 'CI/CD'],
          educationLevel: "Bachelor's in CS",
          lastRole: 'Senior Engineer at Acme',
          matchScore: 87,
          topStrengths: ['Strong TS background', 'Direct NestJS experience', 'Senior-level ownership'],
          topGaps: ['No stated PostgreSQL experience', 'No leadership experience mentioned'],
        },
      });

      const res = await api()
        .post(`/api/ai/cv-score/${applicationId}`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(201);
      expect(res.body.scored).toBe(true);
      expect(res.body.matchScore).toBe(87);

      const check = await api()
        .get(`/api/applications/${applicationId}`)
        .set('Authorization', `Bearer ${recruiterToken}`);
      expect(check.body.aiScore).toBe(87);
      expect(check.body.aiStrengths).toHaveLength(3);
      expect(check.body.aiGaps).toHaveLength(2);
    });

    it('degrades gracefully (scored=false, aiScore stays null) when AI fails — designated fallback feature', async () => {
      generateJson.mockResolvedValue({
        ok: false,
        reason: 'rate_limited',
        message: 'AI service rate limit reached',
      });

      const freshAppRes = await api()
        .post('/api/applications')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ jobPostingId: jobId, yearsOfExperience: 2 });
      const freshAppId = freshAppRes.body.id;
      await dataSource.query(
        `UPDATE applications SET cv_extracted_text = $1 WHERE id = $2`,
        ['Some CV text', freshAppId],
      );

      const res = await api()
        .post(`/api/ai/cv-score/${freshAppId}`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(201);
      expect(res.body.scored).toBe(false);
      expect(res.body.message).toMatch(/manual review/i);

      const check = await api()
        .get(`/api/applications/${freshAppId}`)
        .set('Authorization', `Bearer ${recruiterToken}`);
      expect(check.body.aiScore).toBeNull();
      // The application must still be visible to a human reviewer — a
      // scoring failure never removes it from the list.
      const list = await api()
        .get(`/api/applications?jobId=${jobId}`)
        .set('Authorization', `Bearer ${recruiterToken}`);
      expect(list.body.find((a: any) => a.id === freshAppId)).toBeDefined();
    });

    it('skips the AI call entirely when there is no CV text yet', async () => {
      const noCvRes = await api()
        .post('/api/applications')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ jobPostingId: jobId, yearsOfExperience: 1 });

      const res = await api()
        .post(`/api/ai/cv-score/${noCvRes.body.id}`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(201);
      expect(res.body.scored).toBe(false);
      expect(generateJson).not.toHaveBeenCalled();
    });
  });

  describe('GET /applications sorted by aiScore', () => {
    it('sorts scored applications above unscored ones (NULLS LAST)', async () => {
      const res = await api()
        .get(`/api/applications?jobId=${jobId}&sortBy=aiScore`)
        .set('Authorization', `Bearer ${recruiterToken}`);
      expect(res.status).toBe(200);
      const scores = res.body.map((a: any) => a.aiScore);
      const firstNullIndex = scores.findIndex((s: any) => s === null);
      if (firstNullIndex !== -1) {
        // every non-null score must appear before every null
        expect(
          scores.slice(firstNullIndex).every((s: any) => s === null),
        ).toBe(true);
      }
    });
  });

  describe('POST /ai/interview-questions', () => {
    it('rejects a CANDIDATE', async () => {
      const res = await api()
        .post('/api/ai/interview-questions')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ applicationId, interviewType: 'technical' });
      expect(res.status).toBe(403);
    });

    it('returns AI-generated questions on success', async () => {
      generateJson.mockResolvedValue({
        ok: true,
        data: {
          questions: [{ question: 'Explain X', listenFor: 'Depth of understanding' }],
        },
      });

      const res = await api()
        .post('/api/ai/interview-questions')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ applicationId, interviewType: 'technical' });

      expect(res.status).toBe(201);
      expect(res.body.isFallback).toBe(false);
      expect(res.body.questions[0].question).toBe('Explain X');
    });

    it('falls back to the static question bank for the interview type when AI fails', async () => {
      generateJson.mockResolvedValue({
        ok: false,
        reason: 'timeout',
        message: 'AI request timed out',
      });

      const res = await api()
        .post('/api/ai/interview-questions')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ applicationId, interviewType: 'behavioural' });

      expect(res.status).toBe(201);
      expect(res.body.isFallback).toBe(true);
      expect(res.body.questions).toEqual(
        INTERVIEW_QUESTION_FALLBACKS.behavioural,
      );
    });
  });

  describe('PATCH /ai/interview-questions/:interviewId', () => {
    it('persists the final edited question list onto the interview', async () => {
      const finalQuestions = [
        { question: 'Edited Q1', listenFor: 'Note 1' },
        { question: 'Edited Q2', listenFor: 'Note 2' },
      ];
      const res = await api()
        .patch(`/api/ai/interview-questions/${interviewId}`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ questions: finalQuestions });

      expect(res.status).toBe(200);
      expect(res.body.questions).toEqual(finalQuestions);

      const check = await api()
        .get(`/api/interviews/${interviewId}`)
        .set('Authorization', `Bearer ${recruiterToken}`);
      expect(check.body.id).toBe(interviewId);
    });
  });

  describe('POST /ai/offer-letter', () => {
    const payload = {
      candidateName: 'Jane Doe',
      roleTitle: 'Backend Engineer',
      salary: 95000,
      startDate: '2026-09-01',
      probationPeriod: '90 days',
      benefits: ['Health insurance', '25 days PTO'],
      companyName: 'Acme Inc.',
    };

    it('rejects a CANDIDATE', async () => {
      const res = await api()
        .post('/api/ai/offer-letter')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send(payload);
      expect(res.status).toBe(403);
    });

    it('drafts a letter on success', async () => {
      generateJson.mockResolvedValue({
        ok: true,
        data: { letterText: 'Dear Jane Doe, we are pleased to offer you...' },
      });

      const res = await api()
        .post('/api/ai/offer-letter')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.isFallback).toBe(false);
      expect(res.body.letterText).toContain('Jane Doe');
    });

    it('falls back to a manual-draft template when AI fails', async () => {
      generateJson.mockResolvedValue({
        ok: false,
        reason: 'error',
        message: 'AI service is not configured',
      });

      const res = await api()
        .post('/api/ai/offer-letter')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.isFallback).toBe(true);
      expect(res.body.letterText).toContain('Jane Doe');
    });
  });

  describe('Offers — AI draft never auto-sends', () => {
    let offerId: string;

    it('creates a draft offer (letter drafted separately via /ai/offer-letter)', async () => {
      generateJson.mockResolvedValue({
        ok: true,
        data: { letterText: 'Dear Jane, formal offer letter body.' },
      });
      const letterRes = await api()
        .post('/api/ai/offer-letter')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          candidateName: 'Jane Doe',
          roleTitle: 'Backend Engineer',
          salary: 95000,
          startDate: '2026-09-01',
          probationPeriod: '90 days',
          benefits: ['Health insurance'],
          companyName: 'Acme Inc.',
        });

      const res = await api()
        .post('/api/offers')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          applicationId,
          salary: 95000,
          startDate: '2026-09-01',
          benefits: ['Health insurance'],
          letterText: letterRes.body.letterText,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('draft');
      offerId = res.body.id;
    });

    it('rejects a candidate responding before the offer is sent', async () => {
      const res = await api()
        .patch(`/api/offers/${offerId}/respond`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ response: 'accepted' });
      expect(res.status).toBe(400);
    });

    it('requires an explicit approve-and-send call to move status to sent', async () => {
      const res = await api()
        .post(`/api/offers/${offerId}/approve-and-send`)
        .set('Authorization', `Bearer ${recruiterToken}`);
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('sent');
    });

    it('lets the candidate respond once the offer has been sent', async () => {
      const res = await api()
        .patch(`/api/offers/${offerId}/respond`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ response: 'accepted' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('accepted');
    });
  });
});
