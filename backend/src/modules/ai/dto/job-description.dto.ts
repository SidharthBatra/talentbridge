import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class GenerateJobDescriptionDto {
  @ApiProperty({ example: 'Senior Backend Engineer' })
  @IsString()
  @MinLength(1)
  jobTitle: string;

  @ApiProperty({ example: 'Engineering' })
  @IsString()
  @MinLength(1)
  department: string;

  @ApiProperty({ type: [String], minItems: 3, maxItems: 5, example: ['TypeScript', 'NestJS', 'PostgreSQL'] })
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  requiredSkills: string[];

  @ApiProperty({ enum: ['junior', 'mid', 'senior'] })
  @IsIn(['junior', 'mid', 'senior'])
  level: 'junior' | 'mid' | 'senior';

  @ApiProperty({ required: false, example: 'We value async-first, no-meeting Wednesdays.' })
  @IsOptional()
  @IsString()
  cultureNotes?: string;
}

export class JobDescriptionResponseDto {
  @ApiProperty()
  roleSummary: string;

  @ApiProperty({ type: [String] })
  keyResponsibilities: string[];

  @ApiProperty({ type: [String] })
  requiredQualifications: string[];

  @ApiProperty({ type: [String] })
  preferredQualifications: string[];

  @ApiProperty({ type: [String] })
  whatWeOffer: string[];

  @ApiProperty({
    description:
      'True if this is a placeholder returned because the AI service failed or is unavailable.',
  })
  isFallback: boolean;
}
