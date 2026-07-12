import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../../common/enums/role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true })
  email: string;

  /** bcrypt hash — never serialized in any response DTO. */
  @Column({ type: 'varchar', name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'enum', enum: Role, default: Role.CANDIDATE })
  role: Role;

  /**
   * Company scope for RECRUITER / HIRING_MANAGER / ADMIN.
   * Nullable — candidates have no company. FK wiring belongs to a later
   * companies module; kept as a plain uuid column here.
   */
  @Column({ type: 'uuid', name: 'company_id', nullable: true })
  companyId: string | null;

  /** Soft deactivation for admin user management. */
  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
