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
import { Application } from '../applications/entities/application.entity';
import { CreateJobPostingDto } from './dto/create-job-posting.dto';
import { JobPostingStatsDto } from './dto/job-posting-response.dto';
import { UpdateJobPostingDto } from './dto/update-job-posting.dto';
import { JobPosting } from './entities/job-posting.entity';

/**
 * Valid forward-only status transitions. Any pair not listed here (including
 * every backward move) is rejected.
 */
const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  [JobStatus.DRAFT]: [JobStatus.PUBLISHED],
  [JobStatus.PUBLISHED]: [JobStatus.CLOSED],
  [JobStatus.CLOSED]: [JobStatus.ARCHIVED],
  [JobStatus.ARCHIVED]: [],
};

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(JobPosting)
    private readonly jobsRepository: Repository<JobPosting>,
    @InjectRepository(Application)
    private readonly applicationsRepository: Repository<Application>,
  ) {}

  create(dto: CreateJobPostingDto, createdBy: string): Promise<JobPosting> {
    const job = this.jobsRepository.create({
      ...dto,
      cultureNotes: dto.cultureNotes ?? null,
      status: JobStatus.DRAFT,
      createdBy,
    });
    return this.jobsRepository.save(job);
  }

  /** Internal view (recruiter/admin): all statuses, optionally filtered. */
  findAllInternal(status?: JobStatus): Promise<JobPosting[]> {
    return this.jobsRepository.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
    });
  }

  /** Public view: published jobs only, for CANDIDATE / anonymous browsing. */
  findPublished(): Promise<JobPosting[]> {
    return this.jobsRepository.find({
      where: { status: JobStatus.PUBLISHED },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<JobPosting> {
    const job = await this.jobsRepository.findOne({ where: { id } });
    if (!job) {
      throw new NotFoundException('Job posting not found');
    }
    return job;
  }

  /** Fetch a job but only if it's published — used by candidate-facing routes. */
  async findPublishedById(id: string): Promise<JobPosting> {
    const job = await this.findById(id);
    if (job.status !== JobStatus.PUBLISHED) {
      throw new NotFoundException('Job posting not found');
    }
    return job;
  }

  async update(id: string, dto: UpdateJobPostingDto): Promise<JobPosting> {
    const job = await this.findById(id);
    Object.assign(job, dto);
    return this.jobsRepository.save(job);
  }

  async transitionStatus(id: string, target: JobStatus): Promise<JobPosting> {
    const job = await this.findById(id);
    const allowed = VALID_TRANSITIONS[job.status];
    if (!allowed.includes(target)) {
      throw new BadRequestException(
        `Cannot transition job posting from '${job.status}' to '${target}'. ` +
          `Valid next status: ${allowed.length ? allowed.join(', ') : 'none (terminal state)'}.`,
      );
    }
    job.status = target;
    return this.jobsRepository.save(job);
  }

  async remove(id: string): Promise<void> {
    const job = await this.findById(id);
    await this.jobsRepository.remove(job);
  }

  /** Enforces that only the creator (or an ADMIN) may mutate a job posting. */
  assertCanManage(job: JobPosting, userId: string, role: Role): void {
    if (role !== Role.ADMIN && job.createdBy !== userId) {
      throw new ForbiddenException('You do not manage this job posting');
    }
  }

  async getStats(id: string): Promise<JobPostingStatsDto> {
    const job = await this.findById(id);
    const applications = await this.applicationsRepository.find({
      where: { jobPostingId: id },
    });

    const stageCounts = Object.values(ApplicationStage).reduce(
      (acc, stage) => {
        acc[stage] = 0;
        return acc;
      },
      {} as Record<ApplicationStage, number>,
    );
    for (const app of applications) {
      stageCounts[app.stage] += 1;
    }

    const daysOpen = Math.floor(
      (Date.now() - job.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      jobPostingId: job.id,
      totalApplications: applications.length,
      stageCounts: stageCounts as any,
      daysOpen,
    };
  }
}
