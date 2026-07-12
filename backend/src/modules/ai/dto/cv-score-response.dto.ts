import { ApiProperty } from '@nestjs/swagger';

export class CvScoreResponseDto {
  @ApiProperty({
    description:
      'False if AI scoring failed/was unavailable — aiScore is left null on the ' +
      'application and this application still requires manual review.',
  })
  scored: boolean;

  @ApiProperty({ required: false })
  candidateName?: string;

  @ApiProperty({ required: false })
  yearsOfExperience?: number;

  @ApiProperty({ required: false, type: [String] })
  topSkills?: string[];

  @ApiProperty({ required: false })
  educationLevel?: string;

  @ApiProperty({ required: false })
  lastRole?: string;

  @ApiProperty({ required: false, description: '0-100' })
  matchScore?: number;

  @ApiProperty({ required: false, type: [String] })
  topStrengths?: string[];

  @ApiProperty({ required: false, type: [String] })
  topGaps?: string[];

  @ApiProperty({
    required: false,
    description: 'Present only when scored=false; explains why manual review is needed.',
  })
  message?: string;
}
