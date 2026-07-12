import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Role } from '../src/common/enums/role.enum';

/**
 * Full HTTP integration tests for the auth + users controllers and the
 * role guard. Requires a running Postgres (see docker-compose / README).
 * Set DATABASE_URL to point at a disposable test database.
 *
 * Covers: register, login, invalid credentials, refresh (incl. expired /
 * revoked), logout, and CANDIDATE-token rejection on an ADMIN-only route.
 */
describe('Auth & Users (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwt: JwtService;

  const unique = Date.now();
  const admin = {
    email: `admin_${unique}@acme.com`,
    password: 'AdminPass1!',
    name: 'Admin',
    role: Role.ADMIN,
  };
  const candidate = {
    email: `cand_${unique}@acme.com`,
    password: 'CandPass1!',
    name: 'Cand',
    role: Role.CANDIDATE,
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
    jwt = app.get(JwtService);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.query(
        `DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%_${unique}@acme.com')`,
      );
      await dataSource.query(
        `DELETE FROM users WHERE email LIKE '%_${unique}@acme.com'`,
      );
    }
    await app?.close();
  });

  const api = () => request(app.getHttpServer());

  it('POST /api/auth/register creates a user and returns tokens (no password)', async () => {
    const res = await api().post('/api/auth/register').send(candidate);
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.refreshToken).toEqual(expect.any(String));
    expect(res.body.user.email).toBe(candidate.email.toLowerCase());
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('POST /api/auth/register rejects a duplicate email', async () => {
    const res = await api().post('/api/auth/register').send(candidate);
    expect(res.status).toBe(409);
  });

  it('POST /api/auth/register validates the payload', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ email: 'bad', password: 'x', name: '', role: 'NOPE' });
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/login rejects invalid credentials', async () => {
    const res = await api()
      .post('/api/auth/login')
      .send({ email: candidate.email, password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/login returns tokens for valid credentials', async () => {
    const res = await api()
      .post('/api/auth/login')
      .send({ email: candidate.email, password: candidate.password });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
  });

  it('POST /api/auth/refresh issues a new access token then revokes the old refresh token', async () => {
    const login = await api()
      .post('/api/auth/login')
      .send({ email: candidate.email, password: candidate.password });
    const oldRefresh = login.body.refreshToken;

    const refreshed = await api()
      .post('/api/auth/refresh')
      .send({ refreshToken: oldRefresh });
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.accessToken).toEqual(expect.any(String));

    // The rotated (old) token must no longer be accepted.
    const reuse = await api()
      .post('/api/auth/refresh')
      .send({ refreshToken: oldRefresh });
    expect(reuse.status).toBe(401);
  });

  it('POST /api/auth/refresh rejects an expired refresh token', async () => {
    const expired = jwt.sign(
      { sub: 'x', email: 'x', role: Role.CANDIDATE, companyId: null },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '-1s' },
    );
    const res = await api()
      .post('/api/auth/refresh')
      .send({ refreshToken: expired });
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/logout revokes the refresh token', async () => {
    const login = await api()
      .post('/api/auth/login')
      .send({ email: candidate.email, password: candidate.password });
    const refreshToken = login.body.refreshToken;

    const logout = await api()
      .post('/api/auth/logout')
      .send({ refreshToken });
    expect(logout.status).toBe(200);

    const afterLogout = await api()
      .post('/api/auth/refresh')
      .send({ refreshToken });
    expect(afterLogout.status).toBe(401);
  });

  it('rejects an unauthenticated request to the ADMIN route', async () => {
    const res = await api().get('/api/users');
    expect(res.status).toBe(401);
  });

  it('rejects a CANDIDATE token on the ADMIN-only route (RolesGuard)', async () => {
    const login = await api()
      .post('/api/auth/login')
      .send({ email: candidate.email, password: candidate.password });
    const res = await api()
      .get('/api/users')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('allows an ADMIN token on the ADMIN-only route', async () => {
    await api().post('/api/auth/register').send(admin);
    const login = await api()
      .post('/api/auth/login')
      .send({ email: admin.email, password: admin.password });
    const res = await api()
      .get('/api/users')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
