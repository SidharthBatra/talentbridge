import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InterviewStatus } from '../../common/enums/interview-status.enum';
import { InterviewType } from '../../common/enums/interview-type.enum';
import { ApplicationsService } from '../applications/applications.service';
import { Interview } from './entities/interview.entity';
import { InterviewsService } from './interviews.service';

describe('InterviewsService', () => {
  let service: InterviewsService;
  let repo: any;
  let store: Interview[];

  const buildInterview = (overrides: Partial<Interview> = {}): Interview =>
    ({
      id: 'iv-1',
      applicationId: 'app-1',
      proposedSlots: [
        new Date('2026-08-01T14:00:00Z'),
        new Date('2026-08-02T10:00:00Z'),
      ],
      confirmedSlot: null,
      type: InterviewType.TECHNICAL,
      hiringManagerId: 'hm-1',
      status: InterviewStatus.PROPOSED,
      reminderSentAt: null,
      createdAt: new Date(),
      ...overrides,
    }) as Interview;

  beforeEach(async () => {
    store = [buildInterview()];
    repo = {
      create: (dto: Partial<Interview>) => dto as Interview,
      save: jest.fn(async (iv: Interview) => {
        const idx = store.findIndex((i) => i.id === iv.id);
        if (idx >= 0) store[idx] = iv;
        else store.push(iv);
        return iv;
      }),
      findOne: jest.fn(async ({ where }: any) =>
        store.find((i) => i.id === where.id) ?? null,
      ),
      find: jest.fn(async ({ where }: any) =>
        store.filter(
          (i) =>
            i.hiringManagerId === where.hiringManagerId &&
            i.status === where.status,
        ),
      ),
    };

    const applicationsService = {
      findById: jest.fn(async () => ({ id: 'app-1' }) as any),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        InterviewsService,
        { provide: getRepositoryToken(Interview), useValue: repo },
        { provide: ApplicationsService, useValue: applicationsService },
      ],
    }).compile();

    service = moduleRef.get(InterviewsService);
  });

  it('confirms a slot that is in the proposed list', async () => {
    const result = await service.confirmSlot('iv-1', {
      slot: '2026-08-01T14:00:00Z',
    });
    expect(result.status).toBe(InterviewStatus.CONFIRMED);
    expect(result.confirmedSlot?.toISOString()).toBe(
      '2026-08-01T14:00:00.000Z',
    );
  });

  it('rejects confirming a slot that was not proposed', async () => {
    await expect(
      service.confirmSlot('iv-1', { slot: '2026-08-03T09:00:00Z' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('detects an overlapping confirmed interview for the same hiring manager', async () => {
    store.push(
      buildInterview({
        id: 'iv-2',
        proposedSlots: [new Date('2026-08-01T14:30:00Z')],
        confirmedSlot: new Date('2026-08-01T14:30:00Z'),
        status: InterviewStatus.CONFIRMED,
      }),
    );

    await expect(
      service.confirmSlot('iv-1', { slot: '2026-08-01T14:00:00Z' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows a non-overlapping confirmed slot for the same hiring manager', async () => {
    store.push(
      buildInterview({
        id: 'iv-2',
        proposedSlots: [new Date('2026-08-01T09:00:00Z')],
        confirmedSlot: new Date('2026-08-01T09:00:00Z'), // 09:00-10:00, no overlap with 14:00
        status: InterviewStatus.CONFIRMED,
      }),
    );

    const result = await service.confirmSlot('iv-1', {
      slot: '2026-08-01T14:00:00Z',
    });
    expect(result.status).toBe(InterviewStatus.CONFIRMED);
  });

  it('does not conflict against a different hiring manager', async () => {
    store.push(
      buildInterview({
        id: 'iv-2',
        hiringManagerId: 'hm-2',
        proposedSlots: [new Date('2026-08-01T14:00:00Z')],
        confirmedSlot: new Date('2026-08-01T14:00:00Z'),
        status: InterviewStatus.CONFIRMED,
      }),
    );

    const result = await service.confirmSlot('iv-1', {
      slot: '2026-08-01T14:00:00Z',
    });
    expect(result.status).toBe(InterviewStatus.CONFIRMED);
  });

  it('rejects confirming an already-confirmed interview', async () => {
    store[0].status = InterviewStatus.CONFIRMED;
    await expect(
      service.confirmSlot('iv-1', { slot: '2026-08-01T14:00:00Z' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
