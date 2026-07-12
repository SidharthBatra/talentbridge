import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApplicationStage } from '../../common/enums/application-stage.enum';
import { Role } from '../../common/enums/role.enum';
import { JobStatus } from '../../common/enums/job-status.enum';
import { JobsService } from '../jobs/jobs.service';
import { Application } from './entities/application.entity';
import { ApplicationsService } from './applications.service';

describe('ApplicationsService', () => {
  let service: ApplicationsService;
  let repo: any;
  let jobsService: jest.Mocked<Partial<JobsService>>;
  let store: Application[];

  const buildApp = (overrides: Partial<Application> = {}): Application =>
    ({
      id: 'app-1',
      jobPostingId: 'job-1',
      candidateId: 'cand-1',
      cvUrl: null,
      cvExtractedText: null,
      coverLetter: null,
      yearsOfExperience: 2,
      salaryExpectation: null,
      availabilityDate: null,
      stage: ApplicationStage.APPLIED,
      aiScore: null,
      aiStrengths: null,
      aiGaps: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as Application;

  beforeEach(async () => {
    store = [buildApp()];
    repo = {
      create: (dto: Partial<Application>) => dto as Application,
      save: jest.fn(async (app: Application) => {
        const idx = store.findIndex((a) => a.id === app.id);
        if (idx >= 0) store[idx] = app;
        else store.push(app);
        return app;
      }),
      findOne: jest.fn(async ({ where }: any) =>
        store.find((a) => a.id === where.id) ?? null,
      ),
      find: jest.fn(async () => store),
    };

    jobsService = {
      findById: jest.fn(async () => ({ status: JobStatus.PUBLISHED }) as any),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: getRepositoryToken(Application), useValue: repo },
        { provide: JobsService, useValue: jobsService },
      ],
    }).compile();

    service = moduleRef.get(ApplicationsService);
  });

  describe('create', () => {
    it('rejects applying to a non-published job', async () => {
      (jobsService.findById as jest.Mock).mockResolvedValue({
        status: JobStatus.DRAFT,
      });
      await expect(
        service.create(
          { jobPostingId: 'job-1', yearsOfExperience: 1 } as any,
          'cand-2',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates an application in the applied stage for a published job', async () => {
      const app = await service.create(
        { jobPostingId: 'job-1', yearsOfExperience: 3 } as any,
        'cand-2',
      );
      expect(app.stage).toBe(ApplicationStage.APPLIED);
      expect(app.candidateId).toBe('cand-2');
    });
  });

  describe('assertValidTransition (stage-guard rules)', () => {
    it('allows RECRUITER: applied -> screened', () => {
      expect(() =>
        service.assertValidTransition(
          ApplicationStage.APPLIED,
          ApplicationStage.SCREENED,
          Role.RECRUITER,
        ),
      ).not.toThrow();
    });

    it('allows RECRUITER: screened -> shortlisted', () => {
      expect(() =>
        service.assertValidTransition(
          ApplicationStage.SCREENED,
          ApplicationStage.SHORTLISTED,
          Role.RECRUITER,
        ),
      ).not.toThrow();
    });

    it('rejects RECRUITER skipping applied -> shortlisted', () => {
      expect(() =>
        service.assertValidTransition(
          ApplicationStage.APPLIED,
          ApplicationStage.SHORTLISTED,
          Role.RECRUITER,
        ),
      ).toThrow(BadRequestException);
    });

    it('rejects RECRUITER acting on a HIRING_MANAGER-owned stage', () => {
      expect(() =>
        service.assertValidTransition(
          ApplicationStage.SHORTLISTED,
          ApplicationStage.INTERVIEW_SCHEDULED,
          Role.RECRUITER,
        ),
      ).toThrow(ForbiddenException);
    });

    it('allows HIRING_MANAGER: shortlisted -> interview_scheduled -> offer -> hired', () => {
      expect(() =>
        service.assertValidTransition(
          ApplicationStage.SHORTLISTED,
          ApplicationStage.INTERVIEW_SCHEDULED,
          Role.HIRING_MANAGER,
        ),
      ).not.toThrow();
      expect(() =>
        service.assertValidTransition(
          ApplicationStage.INTERVIEW_SCHEDULED,
          ApplicationStage.OFFER,
          Role.HIRING_MANAGER,
        ),
      ).not.toThrow();
      expect(() =>
        service.assertValidTransition(
          ApplicationStage.OFFER,
          ApplicationStage.HIRED,
          Role.HIRING_MANAGER,
        ),
      ).not.toThrow();
    });

    it('allows HIRING_MANAGER to reject from offer', () => {
      expect(() =>
        service.assertValidTransition(
          ApplicationStage.OFFER,
          ApplicationStage.REJECTED,
          Role.HIRING_MANAGER,
        ),
      ).not.toThrow();
    });

    it('rejects HIRING_MANAGER acting on a RECRUITER-owned stage', () => {
      expect(() =>
        service.assertValidTransition(
          ApplicationStage.APPLIED,
          ApplicationStage.SCREENED,
          Role.HIRING_MANAGER,
        ),
      ).toThrow(ForbiddenException);
    });

    it('rejects a CANDIDATE from making any stage transition', () => {
      expect(() =>
        service.assertValidTransition(
          ApplicationStage.APPLIED,
          ApplicationStage.SCREENED,
          Role.CANDIDATE,
        ),
      ).toThrow(ForbiddenException);
    });
  });

  describe('transitionStage (persists on success)', () => {
    it('saves the new stage when the transition is valid', async () => {
      const updated = await service.transitionStage(
        'app-1',
        ApplicationStage.SCREENED,
        Role.RECRUITER,
      );
      expect(updated.stage).toBe(ApplicationStage.SCREENED);
    });

    it('throws and does not persist on an invalid transition', async () => {
      await expect(
        service.transitionStage(
          'app-1',
          ApplicationStage.HIRED,
          Role.RECRUITER,
        ),
      ).rejects.toThrow();
      expect(store[0].stage).toBe(ApplicationStage.APPLIED);
    });
  });

  describe('bulkAction', () => {
    it('advances multiple applications the recruiter owns', async () => {
      store.push(buildApp({ id: 'app-2', stage: ApplicationStage.APPLIED }));
      const result = await service.bulkAction(
        ['app-1', 'app-2'],
        'advance',
        Role.RECRUITER,
      );
      expect(result.succeeded).toEqual(['app-1', 'app-2']);
      expect(result.failed).toHaveLength(0);
      expect(store.find((a) => a.id === 'app-1')?.stage).toBe(
        ApplicationStage.SCREENED,
      );
    });

    it('rejects multiple applications in one call', async () => {
      const result = await service.bulkAction(
        ['app-1'],
        'reject',
        Role.RECRUITER,
      );
      expect(result.succeeded).toEqual(['app-1']);
      expect(store[0].stage).toBe(ApplicationStage.REJECTED);
    });

    it('reports a failure without aborting the batch when a role cannot act on a stage', async () => {
      store.push(
        buildApp({ id: 'app-2', stage: ApplicationStage.SHORTLISTED }),
      );
      const result = await service.bulkAction(
        ['app-1', 'app-2'],
        'advance',
        Role.RECRUITER,
      );
      expect(result.succeeded).toEqual(['app-1']);
      expect(result.failed).toEqual([
        expect.objectContaining({ id: 'app-2' }),
      ]);
    });
  });
});
