import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { User } from './entities/user.entity';

const BCRYPT_ROUNDS = 10;

export interface CreateUserParams {
  email: string;
  password: string;
  name: string;
  role: Role;
  companyId?: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /** Hashes the password and persists a new user. Rejects duplicate emails. */
  async create(params: CreateUserParams): Promise<User> {
    const existing = await this.usersRepository.findOne({
      where: { email: params.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(params.password, BCRYPT_ROUNDS);
    const user = this.usersRepository.create({
      email: params.email.toLowerCase(),
      passwordHash,
      name: params.name,
      role: params.role,
      companyId: params.companyId ?? null,
    });
    return this.usersRepository.save(user);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  findAll(): Promise<User[]> {
    return this.usersRepository.find({ order: { createdAt: 'DESC' } });
  }

  /**
   * Active users with a given role. Backs lightweight cross-role lookups
   * (e.g. a recruiter picking a hiring manager to propose an interview to)
   * that don't need the full ADMIN user-management surface.
   */
  findActiveByRole(role: Role): Promise<User[]> {
    return this.usersRepository.find({
      where: { role, isActive: true },
      order: { name: 'ASC' },
    });
  }

  async updateRole(id: string, role: Role): Promise<User> {
    const user = await this.findById(id);
    user.role = role;
    return this.usersRepository.save(user);
  }

  /** Soft-deactivate a user (admin management). */
  async deactivate(id: string): Promise<User> {
    const user = await this.findById(id);
    user.isActive = false;
    return this.usersRepository.save(user);
  }

  /** Verifies a plaintext password against the stored bcrypt hash. */
  verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(plain, passwordHash);
  }
}
