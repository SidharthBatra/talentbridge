import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApplicationStage } from '../../../common/enums/application-stage.enum';

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'job_posting_id' })
  jobPostingId: string;

  @Index()
  @Column({ type: 'uuid', name: 'candidate_id' })
  candidateId: string;

  @Column({ type: 'varchar', name: 'cv_url', nullable: true })
  cvUrl: string | null;

  /**
   * Extracted plain text of the uploaded CV PDF. Field name is a shared
   * contract with Module 3 (AI scorer) — do not rename.
   */
  @Column({ type: 'text', name: 'cv_extracted_text', nullable: true })
  cvExtractedText: string | null;

  @Column({ type: 'text', name: 'cover_letter', nullable: true })
  coverLetter: string | null;

  @Column({ type: 'int', name: 'years_of_experience' })
  yearsOfExperience: number;

  @Column({ type: 'int', name: 'salary_expectation', nullable: true })
  salaryExpectation: number | null;

  @Column({ type: 'date', name: 'availability_date', nullable: true })
  availabilityDate: string | null;

  @Index()
  @Column({
    type: 'enum',
    enum: ApplicationStage,
    default: ApplicationStage.APPLIED,
  })
  stage: ApplicationStage;

  /**
   * Populated later by Module 3's AI scorer. Columns exist now (nullable) so
   * the AI module needs no schema migration — matches the shared Application
   * entity contract (aiScore/aiStrengths/aiGaps).
   */
  @Column({ type: 'int', name: 'ai_score', nullable: true })
  aiScore: number | null;

  @Column({ type: 'text', array: true, name: 'ai_strengths', nullable: true })
  aiStrengths: string[] | null;

  @Column({ type: 'text', array: true, name: 'ai_gaps', nullable: true })
  aiGaps: string[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
