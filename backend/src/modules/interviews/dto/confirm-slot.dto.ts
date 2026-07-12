import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class ConfirmSlotDto {
  @ApiProperty({
    example: '2026-08-01T14:00:00Z',
    description: 'Must be one of the interview\'s proposedSlots',
  })
  @IsDateString()
  slot: string;
}
