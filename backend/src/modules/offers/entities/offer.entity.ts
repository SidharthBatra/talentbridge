import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OfferStatus } from '../../../common/enums/offer-status.enum';

@Entity('offers')
export class Offer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'application_id' })
  applicationId: string;

  @Column({ type: 'int' })
  salary: number;

  @Column({ type: 'date', name: 'start_date' })
  startDate: string;

  @Column({ type: 'text', array: true, default: '{}' })
  benefits: string[];

  /**
   * AI-drafted letter body (Module 3's Offer Letter Drafter). Never sent
   * automatically — a recruiter must call POST /offers/:id/approve-and-send
   * to move status draft -> sent.
   */
  @Column({ type: 'text', name: 'letter_text', nullable: true })
  letterText: string | null;

  @Column({ type: 'enum', enum: OfferStatus, default: OfferStatus.DRAFT })
  status: OfferStatus;

  @Column({ type: 'text', name: 'counter_offer', nullable: true })
  counterOffer: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
