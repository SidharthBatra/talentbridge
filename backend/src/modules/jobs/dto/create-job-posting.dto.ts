import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { JobType } from '../../../common/enums/job-type.enum';

export class CreateJobPostingDto {
  @ApiProperty({ example: 'Senior Backend Engineer' })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({ example: 'Engineering' })
  @IsString()
  @MinLength(1)
  department: string;

  @ApiProperty({ enum: JobType })
  @IsEnum(JobType)
  type: JobType;

  @ApiProperty({ example: 80000 })
  @IsInt()
  @Min(0)
  salaryBandMin: number;

  @ApiProperty({ example: 110000 })
  @IsInt()
  @Min(0)
  salaryBandMax: number;

  @ApiProperty({ type: [String], example: ['TypeScript', 'NestJS', 'PostgreSQL'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  requiredSkills: string[];

  @ApiProperty({ example: 'Own the backend roadmap for the pipeline module...' })
  @IsString()
  @MinLength(1)
  responsibilities: string;

  @ApiProperty({ required: false, example: 'We value async-first communication.' })
  @IsOptional()
  @IsString()
  cultureNotes?: string;
}
