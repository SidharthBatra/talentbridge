import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsString,
  IsUUID,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateInterviewQuestionsDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  applicationId: string;

  @ApiProperty({ enum: ['technical', 'behavioural', 'final'] })
  @IsIn(['technical', 'behavioural', 'final'])
  interviewType: 'technical' | 'behavioural' | 'final';
}

export class InterviewQuestionDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  question: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  listenFor: string;
}

export class InterviewQuestionsResponseDto {
  @ApiProperty({ type: [InterviewQuestionDto] })
  questions: InterviewQuestionDto[];

  @ApiProperty({
    description:
      'True if this is the static fallback question bank because the AI service ' +
      'failed or is unavailable.',
  })
  isFallback: boolean;
}

export class UpdateInterviewQuestionsDto {
  @ApiProperty({
    type: [InterviewQuestionDto],
    description: "Final, hiring-manager-edited question list to persist onto the interview's questions field",
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => InterviewQuestionDto)
  questions: InterviewQuestionDto[];
}
