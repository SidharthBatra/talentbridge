import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsUUID } from 'class-validator';
import { ApplicationStage } from '../../../common/enums/application-stage.enum';

export class ApplicationQueryDto {
  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  jobId?: string;

  @ApiProperty({ required: false, enum: ApplicationStage })
  @IsOptional()
  @IsEnum(ApplicationStage)
  stage?: ApplicationStage;

  @ApiProperty({
    required: false,
    enum: ['createdAt', 'updatedAt', 'aiScore'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'aiScore'])
  sortBy?: 'createdAt' | 'updatedAt' | 'aiScore';
}
