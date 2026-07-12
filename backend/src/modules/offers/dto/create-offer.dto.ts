import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateOfferDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  applicationId: string;

  @ApiProperty({ example: 95000 })
  @IsInt()
  @Min(0)
  salary: number;

  @ApiProperty({ example: '2026-09-01' })
  @IsString()
  startDate: string;

  @ApiProperty({ type: [String], required: false, default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @ApiProperty({
    required: false,
    description: 'AI-drafted or manually written letter body, editable before sending',
  })
  @IsOptional()
  @IsString()
  letterText?: string;
}
