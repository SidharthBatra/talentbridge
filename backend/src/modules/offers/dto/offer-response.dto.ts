import { ApiProperty } from '@nestjs/swagger';
import { OfferStatus } from '../../../common/enums/offer-status.enum';
import { Offer } from '../entities/offer.entity';

export class OfferResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  applicationId: string;

  @ApiProperty()
  salary: number;

  @ApiProperty()
  startDate: string;

  @ApiProperty({ type: [String] })
  benefits: string[];

  @ApiProperty({ nullable: true })
  letterText: string | null;

  @ApiProperty({ enum: OfferStatus })
  status: OfferStatus;

  @ApiProperty({ nullable: true })
  counterOffer: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(offer: Offer): OfferResponseDto {
    const dto = new OfferResponseDto();
    Object.assign(dto, offer);
    return dto;
  }
}
