import { ApiProperty } from '@nestjs/swagger';
import { JobStatus } from '../../../common/enums/job-status.enum';
import { JobType } from '../../../common/enums/job-type.enum';
import { JobPosting } from '../entities/job-posting.entity';

export class JobPostingResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  department: string;

  @ApiProperty({ enum: JobType })
  type: JobType;

  @ApiProperty()
  salaryBandMin: number;

  @ApiProperty()
  salaryBandMax: number;

  @ApiProperty({ type: [String] })
  requiredSkills: string[];

  @ApiProperty()
  responsibilities: string;

  @ApiProperty({ nullable: true })
  cultureNotes: string | null;

  @ApiProperty({ enum: JobStatus })
  status: JobStatus;

  @ApiProperty({ format: 'uuid' })
  createdBy: string;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(job: JobPosting): JobPostingResponseDto {
    const dto = new JobPostingResponseDto();
    Object.assign(dto, job);
    return dto;
  }
}

export class PipelineStageCounts {
  @ApiProperty() applied: number;
  @ApiProperty() screened: number;
  @ApiProperty() shortlisted: number;
  @ApiProperty() interview_scheduled: number;
  @ApiProperty() offer: number;
  @ApiProperty() hired: number;
  @ApiProperty() rejected: number;
}

export class JobPostingStatsDto {
  @ApiProperty({ format: 'uuid' })
  jobPostingId: string;

  @ApiProperty()
  totalApplications: number;

  @ApiProperty({ type: PipelineStageCounts })
  stageCounts: PipelineStageCounts;

  @ApiProperty({ description: 'Days since the job posting was created' })
  daysOpen: number;
}
