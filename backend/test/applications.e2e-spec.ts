import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Role } from '../src/common/enums/role.enum';
import { JobType } from '../src/common/enums/job-type.enum';
import { CvParserService } from '../src/modules/applications/cv-parser.service';

/**
 * Application / pipeline e2e coverage: apply flow, role-guarded stage
 * transitions (valid + invalid), bulk actions, and CV upload validation
 * (mimetype + size rejection). Requires Postgres.
 */
describe('Applications / Pipeline (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const api = () => request(app.getHttpServer());

  const unique = Date.now();
  const recruiter = {
    email: `apprec_${unique}@acme.com`,
    password: 'RecruitPass1!',
    name: 'Rec',
    role: Role.RECRUITER,
  };
  const hiringManager = {
    email: `apphm_${unique}@acme.com`,
    password: 'HmPass1!',
    name: 'HM',
    role: Role.HIRING_MANAGER,
  };
  const candidate = {
    email: `appcand_${unique}@acme.com`,
    password: 'CandPass1!',
    name: 'Cand',
    role: Role.CANDIDATE,
  };
  const candidate2 = {
    email: `appcand2_${unique}@acme.com`,
    password: 'CandPass1!',
    name: 'Cand2',
    role: Role.CANDIDATE,
  };

  let recruiterToken: string;
  let hmToken: string;
  let candidateToken: string;
  let candidate2Token: string;
  let jobId: string;
  let applicationId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Real PDF text extraction is a third-party library concern
      // (pdf-parse); stubbed here so the CV-upload tests focus on what this
      // module owns: mimetype/size validation, ownership checks, and that
      // the extracted text gets stored on the application.
      .overrideProvider(CvParserService)
      .useValue({ extractText: async () => 'Mocked extracted CV text' })
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
    hmToken = (
      await api().post('/api/auth/register').send(hiringManager)
    ).body.accessToken;
    candidateToken = (
      await api().post('/api/auth/register').send(candidate)
    ).body.accessToken;
    candidate2Token = (
      await api().post('/api/auth/register').send(candidate2)
    ).body.accessToken;

    const jobRes = await api()
      .post('/api/jobs')
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({
        title: 'QA Engineer',
        department: 'Engineering',
        type: JobType.FULL_TIME,
        salaryBandMin: 60000,
        salaryBandMax: 90000,
        requiredSkills: ['Testing'],
        responsibilities: 'Own quality.',
      });
    jobId = jobRes.body.id;
    await api()
      .patch(`/api/jobs/${jobId}/status`)
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ status: 'published' });
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.query(
        `DELETE FROM interviews WHERE application_id IN (SELECT id FROM applications WHERE job_posting_id = $1)`,
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

  it('rejects a RECRUITER applying (CANDIDATE only)', async () => {
    const res = await api()
      .post('/api/applications')
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ jobPostingId: jobId, yearsOfExperience: 2 });
    expect(res.status).toBe(403);
  });

  it('lets a CANDIDATE apply to a published job', async () => {
    const res = await api()
      .post('/api/applications')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({ jobPostingId: jobId, yearsOfExperience: 5 });
    expect(res.status).toBe(201);
    expect(res.body.stage).toBe('applied');
    applicationId = res.body.id;
  });

  it('rejects applying to a non-published job', async () => {
    const draftJob = await api()
      .post('/api/jobs')
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({
        title: 'Draft Role',
        department: 'Eng',
        type: JobType.CONTRACT,
        salaryBandMin: 1,
        salaryBandMax: 2,
        requiredSkills: ['X'],
        responsibilities: 'x',
      });
    const res = await api()
      .post('/api/applications')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({ jobPostingId: draftJob.body.id, yearsOfExperience: 1 });
    expect(res.status).toBe(400);
  });

  it('scopes candidate GET /applications to their own applications only', async () => {
    const res = await api()
      .get('/api/applications')
      .set('Authorization', `Bearer ${candidate2Token}`);
    expect(res.status).toBe(200);
    expect(res.body.find((a: any) => a.id === applicationId)).toBeUndefined();
  });

  it('rejects a HIRING_MANAGER moving applied -> screened (wrong stage owner)', async () => {
    const res = await api()
      .patch(`/api/applications/${applicationId}/stage`)
      .set('Authorization', `Bearer ${hmToken}`)
      .send({ stage: 'screened' });
    expect(res.status).toBe(403);
  });

  it('rejects a RECRUITER skipping applied -> shortlisted', async () => {
    const res = await api()
      .patch(`/api/applications/${applicationId}/stage`)
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ stage: 'shortlisted' });
    expect(res.status).toBe(400);
  });

  it('lets a RECRUITER move applied -> screened -> shortlisted', async () => {
    const r1 = await api()
      .patch(`/api/applications/${applicationId}/stage`)
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ stage: 'screened' });
    expect(r1.status).toBe(200);

    const r2 = await api()
      .patch(`/api/applications/${applicationId}/stage`)
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ stage: 'shortlisted' });
    expect(r2.status).toBe(200);
    expect(r2.body.stage).toBe('shortlisted');
  });

  it('rejects a RECRUITER acting after handoff to HIRING_MANAGER', async () => {
    const res = await api()
      .patch(`/api/applications/${applicationId}/stage`)
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ stage: 'interview_scheduled' });
    expect(res.status).toBe(403);
  });

  it('lets a HIRING_MANAGER move shortlisted -> interview_scheduled -> offer -> hired', async () => {
    const r1 = await api()
      .patch(`/api/applications/${applicationId}/stage`)
      .set('Authorization', `Bearer ${hmToken}`)
      .send({ stage: 'interview_scheduled' });
    expect(r1.status).toBe(200);

    const r2 = await api()
      .patch(`/api/applications/${applicationId}/stage`)
      .set('Authorization', `Bearer ${hmToken}`)
      .send({ stage: 'offer' });
    expect(r2.status).toBe(200);

    const r3 = await api()
      .patch(`/api/applications/${applicationId}/stage`)
      .set('Authorization', `Bearer ${hmToken}`)
      .send({ stage: 'hired' });
    expect(r3.status).toBe(200);
    expect(r3.body.stage).toBe('hired');
  });

  describe('bulk-action', () => {
    let bulkAppId1: string;
    let bulkAppId2: string;

    beforeAll(async () => {
      bulkAppId1 = (
        await api()
          .post('/api/applications')
          .set('Authorization', `Bearer ${candidateToken}`)
          .send({ jobPostingId: jobId, yearsOfExperience: 1 })
      ).body.id;
      bulkAppId2 = (
        await api()
          .post('/api/applications')
          .set('Authorization', `Bearer ${candidate2Token}`)
          .send({ jobPostingId: jobId, yearsOfExperience: 3 })
      ).body.id;
    });

    it('advances multiple applications in one call', async () => {
      const res = await api()
        .post('/api/applications/bulk-action')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ applicationIds: [bulkAppId1, bulkAppId2], action: 'advance' });
      expect(res.status).toBe(201);
      expect(res.body.succeeded).toEqual(
        expect.arrayContaining([bulkAppId1, bulkAppId2]),
      );

      const check = await api()
        .get(`/api/applications/${bulkAppId1}`)
        .set('Authorization', `Bearer ${recruiterToken}`);
      expect(check.body.stage).toBe('screened');
    });

    it('rejects multiple applications in one call', async () => {
      const res = await api()
        .post('/api/applications/bulk-action')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ applicationIds: [bulkAppId1, bulkAppId2], action: 'reject' });
      expect(res.status).toBe(201);
      expect(res.body.succeeded).toEqual(
        expect.arrayContaining([bulkAppId1, bulkAppId2]),
      );

      const check = await api()
        .get(`/api/applications/${bulkAppId2}`)
        .set('Authorization', `Bearer ${recruiterToken}`);
      expect(check.body.stage).toBe('rejected');
    });
  });

  describe('CV upload', () => {
    let cvAppId: string;

    beforeAll(async () => {
      cvAppId = (
        await api()
          .post('/api/applications')
          .set('Authorization', `Bearer ${candidateToken}`)
          .send({ jobPostingId: jobId, yearsOfExperience: 2 })
      ).body.id;
    });

    const minimalPdf = Buffer.from(
      '%PDF-1.4\n' +
        '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
        '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
        '3 0 obj<</Type/Page/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/MediaBox[0 0 200 100]/Contents 5 0 R>>endobj\n' +
        '4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n' +
        '5 0 obj<</Length 44>>stream\nBT /F1 24 Tf 10 50 Td (Hello CV Text) Tj ET\nendstream\nendobj\n' +
        'trailer<</Size 6/Root 1 0 R>>\n' +
        '%%EOF',
      'utf-8',
    );

    it('rejects a non-PDF file', async () => {
      const res = await api()
        .post(`/api/applications/${cvAppId}/cv`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .attach('file', Buffer.from('just some text'), {
          filename: 'resume.txt',
          contentType: 'text/plain',
        });
      expect(res.status).toBe(400);
    });

    it('rejects a file over 5MB', async () => {
      const oversized = Buffer.concat([
        Buffer.from('%PDF-1.4\n'),
        Buffer.alloc(6 * 1024 * 1024, 'a'),
      ]);
      const res = await api()
        .post(`/api/applications/${cvAppId}/cv`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .attach('file', oversized, {
          filename: 'huge.pdf',
          contentType: 'application/pdf',
        });
      expect(res.status).toBe(400);
    });

    it('rejects another candidate uploading a CV to someone else\'s application', async () => {
      const res = await api()
        .post(`/api/applications/${cvAppId}/cv`)
        .set('Authorization', `Bearer ${candidate2Token}`)
        .attach('file', minimalPdf, {
          filename: 'resume.pdf',
          contentType: 'application/pdf',
        });
      expect(res.status).toBe(403);
    });

    it('accepts a valid PDF and extracts text into cvExtractedText', async () => {
      const res = await api()
        .post(`/api/applications/${cvAppId}/cv`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .attach('file', minimalPdf, {
          filename: 'resume.pdf',
          contentType: 'application/pdf',
        });
      expect(res.status).toBe(201);
      expect(res.body.cvUrl).toEqual(expect.any(String));
      expect(typeof res.body.cvExtractedText).toBe('string');
    });
  });
});
