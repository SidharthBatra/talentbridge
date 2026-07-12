import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InterviewStatus } from '../../../common/enums/interview-status.enum';
import { InterviewType } from '../../../common/enums/interview-type.enum';

@Entity('interviews')
export class Interview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'application_id' })
  applicationId: string;

  @Column({ type: 'timestamptz', array: true, name: 'proposed_slots' })
  proposedSlots: Date[];

  @Column({ type: 'timestamptz', name: 'confirmed_slot', nullable: true })
  confirmedSlot: Date | null;

  @Column({ type: 'enum', enum: InterviewType })
  type: InterviewType;

  @Index()
  @Column({ type: 'uuid', name: 'hiring_manager_id' })
  hiringManagerId: string;

  @Column({
    type: 'enum',
    enum: InterviewStatus,
    default: InterviewStatus.PROPOSED,
  })
  status: InterviewStatus;

  /** Guards the reminder cron from emitting more than once per interview. */
  @Column({ type: 'timestamptz', name: 'reminder_sent_at', nullable: true })
  reminderSentAt: Date | null;

  /**
   * Final, hiring-manager-edited interview questions (AI-suggested, then
   * possibly added-to/removed/reordered client-side). Populated via
   * Module 3's PATCH /ai/interview-questions/:interviewId.
   */
  @Column({ type: 'jsonb', nullable: true })
  questions: { question: string; listenFor: string }[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
