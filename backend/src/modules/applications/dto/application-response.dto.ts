import { ApiProperty } from '@nestjs/swagger';
import { ApplicationStage } from '../../../common/enums/application-stage.enum';
import { Application } from '../entities/application.entity';

export class ApplicationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  jobPostingId: string;

  @ApiProperty({ format: 'uuid' })
  candidateId: string;

  @ApiProperty({ nullable: true })
  cvUrl: string | null;

  @ApiProperty({ nullable: true })
  cvExtractedText: string | null;

  @ApiProperty({ nullable: true })
  coverLetter: string | null;

  @ApiProperty()
  yearsOfExperience: number;

  @ApiProperty({ nullable: true })
  salaryExpectation: number | null;

  @ApiProperty({ nullable: true })
  availabilityDate: string | null;

  @ApiProperty({ enum: ApplicationStage })
  stage: ApplicationStage;

  @ApiProperty({ nullable: true })
  aiScore: number | null;

  @ApiProperty({ type: [String], nullable: true })
  aiStrengths: string[] | null;

  @ApiProperty({ type: [String], nullable: true })
  aiGaps: string[] | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(app: Application): ApplicationResponseDto {
    const dto = new ApplicationResponseDto();
    Object.assign(dto, app);
    return dto;
  }
}
