import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  jobPostingId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  coverLetter?: string;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(0)
  yearsOfExperience: number;

  @ApiProperty({ required: false, example: 95000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  salaryExpectation?: number;

  @ApiProperty({ required: false, example: '2026-09-01' })
  @IsOptional()
  @IsDateString()
  availabilityDate?: string;
}
