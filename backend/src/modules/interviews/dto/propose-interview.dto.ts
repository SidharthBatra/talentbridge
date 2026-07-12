import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { InterviewType } from '../../../common/enums/interview-type.enum';

export class ProposeInterviewDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  applicationId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  hiringManagerId: string;

  @ApiProperty({ enum: InterviewType })
  @IsEnum(InterviewType)
  type: InterviewType;

  @ApiProperty({
    type: [String],
    example: ['2026-08-01T14:00:00Z', '2026-08-02T10:00:00Z'],
    description: 'Candidate datetimes offered for the interview (ISO 8601)',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsDateString({}, { each: true })
  proposedSlots: string[];
}
