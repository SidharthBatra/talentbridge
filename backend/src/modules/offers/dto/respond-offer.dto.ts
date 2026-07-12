import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class RespondOfferDto {
  @ApiProperty({ enum: ['accepted', 'rejected', 'negotiating'] })
  @IsIn(['accepted', 'rejected', 'negotiating'])
  response: 'accepted' | 'rejected' | 'negotiating';

  @ApiProperty({ required: false, description: 'Required when response=negotiating' })
  @IsOptional()
  @IsString()
  counterOffer?: string;
}
