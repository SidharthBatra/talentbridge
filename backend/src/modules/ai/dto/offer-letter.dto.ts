import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsString, Min, MinLength } from 'class-validator';

export class GenerateOfferLetterDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @MinLength(1)
  candidateName: string;

  @ApiProperty({ example: 'Senior Backend Engineer' })
  @IsString()
  @MinLength(1)
  roleTitle: string;

  @ApiProperty({ example: 95000 })
  @IsInt()
  @Min(0)
  salary: number;

  @ApiProperty({ example: '2026-09-01' })
  @IsString()
  startDate: string;

  @ApiProperty({ example: '90 days' })
  @IsString()
  probationPeriod: string;

  @ApiProperty({ type: [String], example: ['Health insurance', '25 days PTO'] })
  @IsArray()
  @IsString({ each: true })
  benefits: string[];

  @ApiProperty({ example: 'Acme Inc.' })
  @IsString()
  @MinLength(1)
  companyName: string;
}

export class OfferLetterResponseDto {
  @ApiProperty()
  letterText: string;

  @ApiProperty({
    description:
      'True if this is a placeholder letter returned because the AI service ' +
      'failed or is unavailable.',
  })
  isFallback: boolean;
}
