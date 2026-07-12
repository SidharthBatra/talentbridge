import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsDateString } from 'class-validator';

/** Used by a recruiter to offer alternative slots after a candidate declines. */
export class ProposeSlotsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsDateString({}, { each: true })
  proposedSlots: string[];
}
