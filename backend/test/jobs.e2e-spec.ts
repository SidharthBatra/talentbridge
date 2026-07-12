import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Role } from '../src/common/enums/role.enum';
import { JobType } from '../src/common/enums/job-type.enum';

/**
 * Job posting CRUD + status-transition guard rules (e2e, requires Postgres).
 */
describe('Job Postings (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const api = () => request(app.getHttpServer());

  const unique = Date.now();
  const recruiter = {
    email: `recruiter_${unique}@acme.com`,
    password: 'RecruitPass1!',
    name: 'Rec',
    role: Role.RECRUITER,
  };
  const candidate = {
    email: `jobcand_${unique}@acme.com`,
    password: 'CandPass1!',
    name: 'Cand',
    role: Role.CANDIDATE,
  };

  let recruiterToken: string;
  let candidateToken: string;

  const jobPayload = {
    title: 'Backend Engineer',
    department: 'Engineering',
    type: JobType.FULL_TIME,
    salaryBandMin: 80000,
    salaryBandMax: 110000,
    requiredSkills: ['TypeScript', 'NestJS'],
    responsibilities: 'Build the pipeline module.',
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

    const recRes = await api().post('/api/auth/register').send(recruiter);
    recruiterToken = recRes.body.accessToken;
    const candRes = await api().post('/api/auth/register').send(candidate);
    candidateToken = candRes.body.accessToken;
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.query(
        `DELETE FROM applications WHERE job_posting_id IN (SELECT id FROM job_postings WHERE created_by IN (SELECT id FROM users WHERE email LIKE '%_${unique}@acme.com'))`,
      );
      await dataSource.query(
        `DELETE FROM job_postings WHERE created_by IN (SELECT id FROM users WHERE email LIKE '%_${unique}@acme.com')`,
      );
      await dataSource.query(
        `DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%_${unique}@acme.com')`,
      );
      await dataSource.query(
        `DELETE FROM users WHERE email LIKE '%_${unique}@acme.com'`,
      );
    }
    await app?.close();
  });

  let jobId: string;

  it('rejects job creation by a CANDIDATE', async () => {
    const res = await api()
      .post('/api/jobs')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send(jobPayload);
    expect(res.status).toBe(403);
  });

  it('lets a RECRUITER create a job posting (starts as draft)', async () => {
    const res = await api()
      .post('/api/jobs')
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send(jobPayload);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('draft');
    jobId = res.body.id;
  });

  it('hides a draft job from the public list', async () => {
    const res = await api().get('/api/jobs/public');
    expect(res.status).toBe(200);
    expect(res.body.find((j: any) => j.id === jobId)).toBeUndefined();
  });

  it('404s a CANDIDATE trying to view a draft job via the public detail route', async () => {
    const res = await api().get(`/api/jobs/public/${jobId}`);
    expect(res.status).toBe(404);
  });

  it('rejects an illegal status transition (draft -> closed, skipping published)', async () => {
    const res = await api()
      .patch(`/api/jobs/${jobId}/status`)
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ status: 'closed' });
    expect(res.status).toBe(400);
  });

  it('publishes the job (draft -> published)', async () => {
    const res = await api()
      .patch(`/api/jobs/${jobId}/status`)
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ status: 'published' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('published');
  });

  it('now shows the job on the public list', async () => {
    const res = await api().get('/api/jobs/public');
    expect(res.status).toBe(200);
    expect(res.body.find((j: any) => j.id === jobId)).toBeDefined();
  });

  it('rejects going backward (published -> draft)', async () => {
    const res = await api()
      .patch(`/api/jobs/${jobId}/status`)
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ status: 'draft' });
    expect(res.status).toBe(400);
  });

  it('closes the job (published -> closed)', async () => {
    const res = await api()
      .patch(`/api/jobs/${jobId}/status`)
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ status: 'closed' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('closed');
  });

  it('archives the job (closed -> archived)', async () => {
    const res = await api()
      .patch(`/api/jobs/${jobId}/status`)
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ status: 'archived' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('archived');
  });

  it('rejects any transition out of the terminal archived state', async () => {
    const res = await api()
      .patch(`/api/jobs/${jobId}/status`)
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ status: 'published' });
    expect(res.status).toBe(400);
  });

  it('returns aggregate stats for a job posting', async () => {
    const res = await api()
      .get(`/api/jobs/${jobId}/stats`)
      .set('Authorization', `Bearer ${recruiterToken}`);
    expect(res.status).toBe(200);
    expect(res.body.totalApplications).toBe(0);
    expect(res.body.stageCounts).toEqual(
      expect.objectContaining({ applied: 0, hired: 0 }),
    );
    expect(typeof res.body.daysOpen).toBe('number');
  });
});
