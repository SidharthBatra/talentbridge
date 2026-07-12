import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Role } from '../../common/enums/role.enum';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { RefreshToken } from './entities/refresh-token.entity';

/**
 * Unit-level coverage of the auth service branches that the e2e suite
 * (which needs Postgres) cannot easily hit — bad credentials, inactive
 * users, token rotation. Uses in-memory fakes, no DB required.
 */
describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let refreshRepo: any;
  let stored: RefreshToken[];

  const configValues: Record<string, string> = {
    'jwt.accessSecret': 'access',
    'jwt.refreshSecret': 'refresh',
    'jwt.accessExpiresIn': '15m',
    'jwt.refreshExpiresIn': '7d',
  };

  const buildUser = (overrides: Partial<User> = {}): User =>
    ({
      id: 'user-1',
      email: 'jane@acme.com',
      passwordHash: 'hashed',
      name: 'Jane',
      role: Role.CANDIDATE,
      companyId: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as User;

  beforeEach(async () => {
    stored = [];
    refreshRepo = {
      create: (dto: Partial<RefreshToken>) => dto as RefreshToken,
      save: jest.fn(async (t: RefreshToken) => {
        if (!stored.includes(t)) stored.push(t);
        return t;
      }),
      findOne: jest.fn(async ({ where }: any) =>
        stored.find(
          (t) =>
            t.userId === where.userId &&
            t.revoked === where.revoked &&
            t.tokenHash === where.tokenHash,
        ) ?? null,
      ),
      delete: jest.fn(),
    };

    usersService = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(async () => buildUser()),
      verifyPassword: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useClass: JwtService },
        {
          provide: ConfigService,
          useValue: { get: (k: string) => configValues[k] },
        },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshRepo },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('rejects login with an unknown email', async () => {
    (usersService.findByEmail as jest.Mock).mockResolvedValue(null);
    await expect(
      service.login({ email: 'nope@x.com', password: 'x' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects login for an inactive user', async () => {
    (usersService.findByEmail as jest.Mock).mockResolvedValue(
      buildUser({ isActive: false }),
    );
    await expect(
      service.login({ email: 'jane@acme.com', password: 'x' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects login with a wrong password', async () => {
    (usersService.findByEmail as jest.Mock).mockResolvedValue(buildUser());
    (usersService.verifyPassword as jest.Mock).mockResolvedValue(false);
    await expect(
      service.login({ email: 'jane@acme.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('issues tokens on valid login and persists a refresh token', async () => {
    (usersService.findByEmail as jest.Mock).mockResolvedValue(buildUser());
    (usersService.verifyPassword as jest.Mock).mockResolvedValue(true);

    const result = await service.login({
      email: 'jane@acme.com',
      password: 'right',
    });

    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
    expect((result.user as any).passwordHash).toBeUndefined();
    expect(stored).toHaveLength(1);
    expect(stored[0].revoked).toBe(false);
  });

  it('rotates the refresh token on refresh and revokes the old one', async () => {
    (usersService.findByEmail as jest.Mock).mockResolvedValue(buildUser());
    (usersService.verifyPassword as jest.Mock).mockResolvedValue(true);
    const login = await service.login({
      email: 'jane@acme.com',
      password: 'right',
    });

    const refreshed = await service.refresh('user-1', login.refreshToken);

    expect(refreshed.accessToken).toEqual(expect.any(String));
    expect(stored[0].revoked).toBe(true); // old token revoked
    expect(stored).toHaveLength(2); // new one persisted
  });

  it('rejects refresh with an unrecognized token', async () => {
    await expect(
      service.refresh('user-1', 'not-a-real-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('revokes the token on logout', async () => {
    (usersService.findByEmail as jest.Mock).mockResolvedValue(buildUser());
    (usersService.verifyPassword as jest.Mock).mockResolvedValue(true);
    const login = await service.login({
      email: 'jane@acme.com',
      password: 'right',
    });

    await service.logout('user-1', login.refreshToken);
    expect(stored[0].revoked).toBe(true);
  });
});
