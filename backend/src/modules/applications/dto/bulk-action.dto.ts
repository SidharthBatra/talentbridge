import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsUUID,
} from 'class-validator';

export class BulkActionDto {
  @ApiProperty({ type: [String], description: 'Application ids to act on' })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  applicationIds: string[];

  @ApiProperty({
    enum: ['advance', 'reject'],
    description:
      '"advance" moves each application one step forward in its own ' +
      'permitted stage path; "reject" moves each straight to rejected.',
  })
  @IsIn(['advance', 'reject'])
  action: 'advance' | 'reject';
}
