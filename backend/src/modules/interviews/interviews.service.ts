import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InterviewStatus } from '../../common/enums/interview-status.enum';
import { ApplicationsService } from '../applications/applications.service';
import { ConfirmSlotDto } from './dto/confirm-slot.dto';
import { ProposeInterviewDto } from './dto/propose-interview.dto';
import { ProposeSlotsDto } from './dto/propose-slots.dto';
import { Interview } from './entities/interview.entity';

/** Interviews are assumed to occupy a fixed one-hour block for conflict checks. */
const INTERVIEW_DURATION_MS = 60 * 60 * 1000;

@Injectable()
export class InterviewsService {
  constructor(
    @InjectRepository(Interview)
    private readonly interviewsRepository: Repository<Interview>,
    private readonly applicationsService: ApplicationsService,
  ) {}

  async propose(dto: ProposeInterviewDto): Promise<Interview> {
    // Ensures the application exists (404s otherwise) before scheduling against it.
    await this.applicationsService.findById(dto.applicationId);

    const interview = this.interviewsRepository.create({
      applicationId: dto.applicationId,
      hiringManagerId: dto.hiringManagerId,
      type: dto.type,
      proposedSlots: dto.proposedSlots.map((s) => new Date(s)),
      confirmedSlot: null,
      status: InterviewStatus.PROPOSED,
    });
    return this.interviewsRepository.save(interview);
  }

  async findById(id: string): Promise<Interview> {
    const interview = await this.interviewsRepository.findOne({ where: { id } });
    if (!interview) {
      throw new NotFoundException('Interview not found');
    }
    return interview;
  }

  /**
   * All interviews scheduled for a given application (any status), newest
   * first. Backs UI that needs "the interview for this application" (e.g.
   * hiring-manager interview prep) without the user having to know or type
   * an interview id.
   */
  findByApplicationId(applicationId: string): Promise<Interview[]> {
    return this.interviewsRepository.find({
      where: { applicationId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Interviews awaiting this candidate's response (status PROPOSED), across
   * all of their applications. Backs the "My Applications" view so a
   * candidate can respond directly from a button instead of having to
   * discover and paste an interview id from anywhere.
   */
  async findPendingForCandidate(candidateId: string): Promise<Interview[]> {
    const applications = await this.applicationsService.findAll(
      {},
      candidateId,
    );
    const applicationIds = applications.map((a) => a.id);
    if (applicationIds.length === 0) {
      return [];
    }
    return this.interviewsRepository
      .createQueryBuilder('interview')
      .where('interview.applicationId IN (:...applicationIds)', {
        applicationIds,
      })
      .andWhere('interview.status = :status', {
        status: InterviewStatus.PROPOSED,
      })
      .getMany();
  }

  /** Candidate confirms one of the proposed slots. Detects double-booking. */
  async confirmSlot(id: string, dto: ConfirmSlotDto): Promise<Interview> {
    const interview = await this.findById(id);
    if (interview.status !== InterviewStatus.PROPOSED) {
      throw new BadRequestException(
        `Cannot confirm a slot for an interview in status '${interview.status}'`,
      );
    }

    const target = new Date(dto.slot);
    const matches = interview.proposedSlots.some(
      (s) => s.getTime() === target.getTime(),
    );
    if (!matches) {
      throw new BadRequestException(
        'Selected slot is not one of the proposed slots for this interview',
      );
    }

    await this.assertNoConflict(interview.hiringManagerId, target, id);

    interview.confirmedSlot = target;
    interview.status = InterviewStatus.CONFIRMED;
    return this.interviewsRepository.save(interview);
  }

  /** Candidate declines all proposed slots; interview stays open for re-proposal. */
  async requestAlternatives(id: string): Promise<Interview> {
    const interview = await this.findById(id);
    if (interview.status !== InterviewStatus.PROPOSED) {
      throw new BadRequestException(
        `Cannot request alternatives for an interview in status '${interview.status}'`,
      );
    }
    interview.proposedSlots = [];
    return this.interviewsRepository.save(interview);
  }

  /** Recruiter offers a fresh set of slots after the candidate declined. */
  async proposeNewSlots(id: string, dto: ProposeSlotsDto): Promise<Interview> {
    const interview = await this.findById(id);
    if (interview.status !== InterviewStatus.PROPOSED) {
      throw new BadRequestException(
        `Cannot propose new slots for an interview in status '${interview.status}'`,
      );
    }
    interview.proposedSlots = dto.proposedSlots.map((s) => new Date(s));
    return this.interviewsRepository.save(interview);
  }

  async cancel(id: string): Promise<Interview> {
    const interview = await this.findById(id);
    interview.status = InterviewStatus.CANCELLED;
    return this.interviewsRepository.save(interview);
  }

  /**
   * Rejects the confirmation if the same hiring manager already has a
   * confirmed interview whose one-hour block overlaps the requested slot.
   */
  private async assertNoConflict(
    hiringManagerId: string,
    slot: Date,
    excludeInterviewId: string,
  ): Promise<void> {
    const slotEnd = new Date(slot.getTime() + INTERVIEW_DURATION_MS);

    const confirmed = await this.interviewsRepository.find({
      where: { hiringManagerId, status: InterviewStatus.CONFIRMED },
    });

    for (const existing of confirmed) {
      if (existing.id === excludeInterviewId || !existing.confirmedSlot) {
        continue;
      }
      const existingEnd = new Date(
        existing.confirmedSlot.getTime() + INTERVIEW_DURATION_MS,
      );
      const overlaps =
        slot.getTime() < existingEnd.getTime() &&
        existing.confirmedSlot.getTime() < slotEnd.getTime();
      if (overlaps) {
        throw new ConflictException(
          `Hiring manager already has a confirmed interview overlapping ${slot.toISOString()}`,
        );
      }
    }
  }

  /** Confirmed interviews for a user, either as candidate or hiring manager. */
  async findCalendarForUser(userId: string): Promise<Interview[]> {
    const asHiringManager = await this.interviewsRepository.find({
      where: { hiringManagerId: userId, status: InterviewStatus.CONFIRMED },
    });

    const candidateApplications = await this.applicationsService.findAll(
      {},
      userId,
    );
    const candidateAppIds = new Set(candidateApplications.map((a) => a.id));

    const allConfirmed = await this.interviewsRepository.find({
      where: { status: InterviewStatus.CONFIRMED },
    });
    const asCandidate = allConfirmed.filter((i) =>
      candidateAppIds.has(i.applicationId),
    );

    const merged = new Map<string, Interview>();
    for (const i of [...asHiringManager, ...asCandidate]) merged.set(i.id, i);
    return Array.from(merged.values()).sort(
      (a, b) => (a.confirmedSlot?.getTime() ?? 0) - (b.confirmedSlot?.getTime() ?? 0),
    );
  }

  /** Confirmed interviews starting within [from, to) with no reminder sent yet. */
  findUpcomingNeedingReminder(from: Date, to: Date): Promise<Interview[]> {
    return this.interviewsRepository
      .createQueryBuilder('interview')
      .where('interview.status = :status', { status: InterviewStatus.CONFIRMED })
      .andWhere('interview.confirmedSlot >= :from', { from })
      .andWhere('interview.confirmedSlot < :to', { to })
      .andWhere('interview.reminderSentAt IS NULL')
      .getMany();
  }

  async markReminderSent(id: string): Promise<void> {
    await this.interviewsRepository.update(id, { reminderSentAt: new Date() });
  }

  /** Persists the hiring manager's final edited question list (Module 3). */
  async setQuestions(
    id: string,
    questions: { question: string; listenFor: string }[],
  ): Promise<Interview> {
    const interview = await this.findById(id);
    interview.questions = questions;
    return this.interviewsRepository.save(interview);
  }
}
