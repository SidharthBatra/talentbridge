import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { JobStatus } from '../../../common/enums/job-status.enum';
import { CreateJobPostingDto } from './create-job-posting.dto';

/** All fields optional; status is changed only via the dedicated transition endpoint. */
export class UpdateJobPostingDto extends PartialType(CreateJobPostingDto) {}

export class UpdateJobStatusDto {
  @ApiProperty({
    enum: JobStatus,
    description:
      'Target status. Must be the next valid step in draft→published→closed→archived.',
  })
  @IsEnum(JobStatus)
  status: JobStatus;
}
