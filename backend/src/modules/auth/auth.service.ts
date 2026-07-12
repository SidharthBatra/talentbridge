import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthTokensDto } from './dto/auth-response.dto';
import { RefreshToken } from './entities/refresh-token.entity';

/**
 * Refresh tokens are stored as a SHA-256 hash (not bcrypt): they are
 * high-entropy JWTs, and bcrypt silently truncates input at 72 bytes — which
 * would make distinct JWTs sharing a prefix collide. SHA-256 is deterministic,
 * so we can also look the token up directly instead of scanning rows.
 */
const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  companyId: string | null;
  /** Unique token id so no two issued tokens are ever byte-identical. */
  jti: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokensDto> {
    const user = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      name: dto.name,
      role: dto.role,
      companyId: dto.companyId ?? null,
    });
    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthTokensDto> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await this.usersService.verifyPassword(
      dto.password,
      user.passwordHash,
    );
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueTokens(user);
  }

  /**
   * Rotate refresh tokens: verify the presented token against the store,
   * revoke it, and mint a new access token. The Passport guard has already
   * verified the JWT signature/expiry before we get here.
   */
  async refresh(userId: string, presentedToken: string): Promise<AuthTokensDto> {
    const record = await this.findValidStoredToken(userId, presentedToken);
    if (!record) {
      throw new UnauthorizedException('Refresh token is invalid or revoked');
    }
    record.revoked = true;
    await this.refreshTokens.save(record);

    const user = await this.usersService.findById(userId);
    return this.issueTokens(user);
  }

  /** Revoke the presented refresh token (idempotent logout). */
  async logout(userId: string, presentedToken: string): Promise<void> {
    const record = await this.findValidStoredToken(userId, presentedToken);
    if (record) {
      record.revoked = true;
      await this.refreshTokens.save(record);
    }
  }

  // ---- internals -----------------------------------------------------------

  private async issueTokens(user: User): Promise<AuthTokensDto> {
    const base = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };

    const accessToken = await this.jwtService.signAsync(
      { ...base, jti: randomUUID() } satisfies TokenPayload,
      {
        secret: this.config.get<string>('jwt.accessSecret'),
        expiresIn: this.config.get<string>('jwt.accessExpiresIn'),
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      { ...base, jti: randomUUID() } satisfies TokenPayload,
      {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshExpiresIn'),
      },
    );

    await this.persistRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: UserResponseDto.fromEntity(user),
    };
  }

  private async persistRefreshToken(
    userId: string,
    token: string,
  ): Promise<void> {
    const decoded = this.jwtService.decode(token) as { exp: number };
    const entity = this.refreshTokens.create({
      userId,
      tokenHash: hashToken(token),
      revoked: false,
      expiresAt: new Date(decoded.exp * 1000),
    });
    await this.refreshTokens.save(entity);
  }

  private async findValidStoredToken(
    userId: string,
    presentedToken: string,
  ): Promise<RefreshToken | null> {
    const record = await this.refreshTokens.findOne({
      where: { userId, revoked: false, tokenHash: hashToken(presentedToken) },
    });
    if (!record || record.expiresAt.getTime() < Date.now()) {
      return null;
    }
    return record;
  }

  /** Housekeeping helper — remove expired rows. Not scheduled here. */
  async purgeExpired(): Promise<void> {
    await this.refreshTokens.delete({ expiresAt: LessThan(new Date()) });
  }
}
