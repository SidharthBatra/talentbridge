import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { JobStatus } from '../../../common/enums/job-status.enum';
import { JobType } from '../../../common/enums/job-type.enum';

@Entity('job_postings')
export class JobPosting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'varchar' })
  department: string;

  @Column({ type: 'enum', enum: JobType })
  type: JobType;

  @Column({ type: 'int', name: 'salary_band_min' })
  salaryBandMin: number;

  @Column({ type: 'int', name: 'salary_band_max' })
  salaryBandMax: number;

  @Column({ type: 'text', array: true, name: 'required_skills', default: '{}' })
  requiredSkills: string[];

  @Column({ type: 'text' })
  responsibilities: string;

  @Column({ type: 'text', name: 'culture_notes', nullable: true })
  cultureNotes: string | null;

  @Index()
  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.DRAFT })
  status: JobStatus;

  @Index()
  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
