import { ApiProperty } from '@nestjs/swagger';
import { InterviewStatus } from '../../../common/enums/interview-status.enum';
import { InterviewType } from '../../../common/enums/interview-type.enum';
import { Interview } from '../entities/interview.entity';

export class InterviewResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  applicationId: string;

  @ApiProperty({ type: [Date] })
  proposedSlots: Date[];

  @ApiProperty({ nullable: true })
  confirmedSlot: Date | null;

  @ApiProperty({ enum: InterviewType })
  type: InterviewType;

  @ApiProperty({ format: 'uuid' })
  hiringManagerId: string;

  @ApiProperty({ enum: InterviewStatus })
  status: InterviewStatus;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(interview: Interview): InterviewResponseDto {
    const dto = new InterviewResponseDto();
    Object.assign(dto, interview);
    return dto;
  }
}
