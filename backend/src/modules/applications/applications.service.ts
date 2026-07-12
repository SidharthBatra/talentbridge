import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationStage } from '../../common/enums/application-stage.enum';
import { JobStatus } from '../../common/enums/job-status.enum';
import { Role } from '../../common/enums/role.enum';
import { JobsService } from '../jobs/jobs.service';
import { ApplicationQueryDto } from './dto/application-query.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { Application } from './entities/application.entity';

/**
 * Per-role forward-only transition map. A role may only move an application
 * out of a stage it "owns"; the target must be one of the listed next
 * stages. ADMIN is the union of both (superuser), enforced in code below.
 */
const RECRUITER_TRANSITIONS: Partial<Record<ApplicationStage, ApplicationStage[]>> = {
  [ApplicationStage.APPLIED]: [ApplicationStage.SCREENED, ApplicationStage.REJECTED],
  [ApplicationStage.SCREENED]: [ApplicationStage.SHORTLISTED, ApplicationStage.REJECTED],
};

const HIRING_MANAGER_TRANSITIONS: Partial<Record<ApplicationStage, ApplicationStage[]>> = {
  [ApplicationStage.SHORTLISTED]: [
    ApplicationStage.INTERVIEW_SCHEDULED,
    ApplicationStage.REJECTED,
  ],
  [ApplicationStage.INTERVIEW_SCHEDULED]: [
    ApplicationStage.OFFER,
    ApplicationStage.REJECTED,
  ],
  [ApplicationStage.OFFER]: [ApplicationStage.HIRED, ApplicationStage.REJECTED],
};

function transitionsForRole(
  role: Role,
): Partial<Record<ApplicationStage, ApplicationStage[]>> {
  if (role === Role.RECRUITER) return RECRUITER_TRANSITIONS;
  if (role === Role.HIRING_MANAGER) return HIRING_MANAGER_TRANSITIONS;
  if (role === Role.ADMIN) {
    const merged: Partial<Record<ApplicationStage, ApplicationStage[]>> = {};
    for (const map of [RECRUITER_TRANSITIONS, HIRING_MANAGER_TRANSITIONS]) {
      for (const [from, tos] of Object.entries(map)) {
        merged[from as ApplicationStage] = [
          ...(merged[from as ApplicationStage] ?? []),
          ...tos,
        ];
      }
    }
    return merged;
  }
  return {};
}

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationsRepository: Repository<Application>,
    private readonly jobsService: JobsService,
  ) {}

  async create(
    dto: CreateApplicationDto,
    candidateId: string,
  ): Promise<Application> {
    const job = await this.jobsService.findById(dto.jobPostingId);
    if (job.status !== JobStatus.PUBLISHED) {
      throw new BadRequestException(
        'You can only apply to a published job posting',
      );
    }

    const application = this.applicationsRepository.create({
      jobPostingId: dto.jobPostingId,
      candidateId,
      coverLetter: dto.coverLetter ?? null,
      yearsOfExperience: dto.yearsOfExperience,
      salaryExpectation: dto.salaryExpectation ?? null,
      availabilityDate: dto.availabilityDate ?? null,
      stage: ApplicationStage.APPLIED,
    });
    return this.applicationsRepository.save(application);
  }

  async findById(id: string): Promise<Application> {
    const application = await this.applicationsRepository.findOne({
      where: { id },
    });
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    return application;
  }

  /**
   * Filtered listing. CANDIDATE role is always scoped to their own
   * applications regardless of query params, enforced by the caller passing
   * `restrictToCandidateId`.
   */
  findAll(
    query: ApplicationQueryDto,
    restrictToCandidateId?: string,
  ): Promise<Application[]> {
    const where: Record<string, unknown> = {};
    if (query.jobId) where.jobPostingId = query.jobId;
    if (query.stage) where.stage = query.stage;
    if (restrictToCandidateId) where.candidateId = restrictToCandidateId;

    return this.applicationsRepository.find({
      where,
      order: { [query.sortBy ?? 'createdAt']: 'DESC' },
    });
  }

  /**
   * Validates and applies a single stage transition for the given actor
   * role. Throws with a clear message on wrong-role or skipped-stage
   * attempts. Returns the saved application on success.
   */
  async transitionStage(
    id: string,
    targetStage: ApplicationStage,
    actorRole: Role,
  ): Promise<Application> {
    const application = await this.findById(id);
    this.assertValidTransition(application.stage, targetStage, actorRole);
    application.stage = targetStage;
    return this.applicationsRepository.save(application);
  }

  assertValidTransition(
    currentStage: ApplicationStage,
    targetStage: ApplicationStage,
    actorRole: Role,
  ): void {
    const allowedMap = transitionsForRole(actorRole);
    const allowedTargets = allowedMap[currentStage];

    if (!allowedTargets) {
      throw new ForbiddenException(
        `Role '${actorRole}' cannot move an application out of stage '${currentStage}'.`,
      );
    }
    if (!allowedTargets.includes(targetStage)) {
      throw new BadRequestException(
        `Invalid transition from '${currentStage}' to '${targetStage}' for role '${actorRole}'. ` +
          `Allowed next stage(s): ${allowedTargets.join(', ')}.`,
      );
    }
  }

  /**
   * Advance each application one permitted step forward, or reject it,
   * according to the actor's role. Applications the actor cannot act on
   * (wrong stage ownership) are reported as failures rather than throwing,
   * so one bad id in a batch doesn't abort the whole call.
   */
  async bulkAction(
    applicationIds: string[],
    action: 'advance' | 'reject',
    actorRole: Role,
  ): Promise<{ succeeded: string[]; failed: { id: string; reason: string }[] }> {
    const succeeded: string[] = [];
    const failed: { id: string; reason: string }[] = [];

    for (const id of applicationIds) {
      try {
        const application = await this.findById(id);
        const allowedMap = transitionsForRole(actorRole);
        const allowedTargets = allowedMap[application.stage];
        if (!allowedTargets || allowedTargets.length === 0) {
          throw new ForbiddenException(
            `Role '${actorRole}' cannot act on stage '${application.stage}'.`,
          );
        }

        const target =
          action === 'reject'
            ? ApplicationStage.REJECTED
            : allowedTargets.find((s) => s !== ApplicationStage.REJECTED);

        if (!target || !allowedTargets.includes(target)) {
          throw new BadRequestException(
            `No valid '${action}' transition from '${application.stage}' for role '${actorRole}'.`,
          );
        }

        application.stage = target;
        await this.applicationsRepository.save(application);
        succeeded.push(id);
      } catch (err) {
        failed.push({
          id,
          reason: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return { succeeded, failed };
  }

  async setCv(
    id: string,
    cvUrl: string,
    cvExtractedText: string,
  ): Promise<Application> {
    const application = await this.findById(id);
    application.cvUrl = cvUrl;
    application.cvExtractedText = cvExtractedText;
    return this.applicationsRepository.save(application);
  }

  /** Ownership check for candidate-facing routes (view own CV upload, etc). */
  assertOwnedByCandidate(application: Application, candidateId: string): void {
    if (application.candidateId !== candidateId) {
      throw new ForbiddenException('This application does not belong to you');
    }
  }
}
