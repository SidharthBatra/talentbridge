import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Role } from '../src/common/enums/role.enum';
import { JobType } from '../src/common/enums/job-type.enum';

/**
 * Interview scheduler e2e coverage: propose -> confirm flow and the
 * overlapping-confirmed-interview conflict rule, over real HTTP.
 */
describe('Interviews (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const api = () => request(app.getHttpServer());

  const unique = Date.now();
  const recruiter = {
    email: `ivrec_${unique}@acme.com`,
    password: 'RecruitPass1!',
    name: 'Rec',
    role: Role.RECRUITER,
  };
  const hiringManager = {
    email: `ivhm_${unique}@acme.com`,
    password: 'HmPass1!',
    name: 'HM',
    role: Role.HIRING_MANAGER,
  };
  const candidate = {
    email: `ivcand_${unique}@acme.com`,
    password: 'CandPass1!',
    name: 'Cand',
    role: Role.CANDIDATE,
  };
  const candidate2 = {
    email: `ivcand2_${unique}@acme.com`,
    password: 'CandPass1!',
    name: 'Cand2',
    role: Role.CANDIDATE,
  };

  let recruiterToken: string;
  let hmToken: string;
  let candidateToken: string;
  let candidate2Token: string;
  let hmUserId: string;
  let jobId: string;
  let application1Id: string;
  let application2Id: string;

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

    recruiterToken = (
      await api().post('/api/auth/register').send(recruiter)
    ).body.accessToken;
    const hmRes = await api().post('/api/auth/register').send(hiringManager);
    hmToken = hmRes.body.accessToken;
    hmUserId = hmRes.body.user.id;
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
        title: 'Platform Engineer',
        department: 'Engineering',
        type: JobType.FULL_TIME,
        salaryBandMin: 70000,
        salaryBandMax: 100000,
        requiredSkills: ['Kubernetes'],
        responsibilities: 'Own the platform.',
      });
    jobId = jobRes.body.id;
    await api()
      .patch(`/api/jobs/${jobId}/status`)
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ status: 'published' });

    application1Id = (
      await api()
        .post('/api/applications')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ jobPostingId: jobId, yearsOfExperience: 4 })
    ).body.id;
    application2Id = (
      await api()
        .post('/api/applications')
        .set('Authorization', `Bearer ${candidate2Token}`)
        .send({ jobPostingId: jobId, yearsOfExperience: 6 })
    ).body.id;
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

  let interview1Id: string;
  let interview2Id: string;
  const slotA = '2026-09-01T14:00:00.000Z';
  const overlappingSlotB = '2026-09-01T14:30:00.000Z';
  const nonOverlappingSlotB = '2026-09-01T16:00:00.000Z';

  it('lets a RECRUITER propose interview slots', async () => {
    const res = await api()
      .post('/api/interviews')
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({
        applicationId: application1Id,
        hiringManagerId: hmUserId,
        type: 'technical',
        proposedSlots: [slotA, '2026-09-02T10:00:00.000Z'],
      });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('proposed');
    interview1Id = res.body.id;
  });

  it('lets the CANDIDATE confirm a proposed slot', async () => {
    const res = await api()
      .patch(`/api/interviews/${interview1Id}/confirm`)
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({ slot: slotA });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('confirmed');
  });

  it('rejects confirming a slot that was never proposed', async () => {
    const propose2 = await api()
      .post('/api/interviews')
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({
        applicationId: application2Id,
        hiringManagerId: hmUserId,
        type: 'technical',
        proposedSlots: [overlappingSlotB],
      });
    interview2Id = propose2.body.id;

    const res = await api()
      .patch(`/api/interviews/${interview2Id}/confirm`)
      .set('Authorization', `Bearer ${candidate2Token}`)
      .send({ slot: '2099-01-01T00:00:00.000Z' });
    expect(res.status).toBe(400);
  });

  it('rejects confirming an overlapping slot for the same hiring manager', async () => {
    const res = await api()
      .patch(`/api/interviews/${interview2Id}/confirm`)
      .set('Authorization', `Bearer ${candidate2Token}`)
      .send({ slot: overlappingSlotB });
    expect(res.status).toBe(409);
  });

  it('allows confirming a non-overlapping slot for the same hiring manager', async () => {
    await api()
      .patch(`/api/interviews/${interview2Id}/slots`)
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ proposedSlots: [nonOverlappingSlotB] });

    const res = await api()
      .patch(`/api/interviews/${interview2Id}/confirm`)
      .set('Authorization', `Bearer ${candidate2Token}`)
      .send({ slot: nonOverlappingSlotB });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('confirmed');
  });

  it('returns confirmed interviews on the calendar for the hiring manager', async () => {
    const res = await api()
      .get(`/api/interviews/calendar?userId=${hmUserId}`)
      .set('Authorization', `Bearer ${hmToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });
});
