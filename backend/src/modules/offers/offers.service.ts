import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OfferStatus } from '../../common/enums/offer-status.enum';
import { CreateOfferDto } from './dto/create-offer.dto';
import { Offer } from './entities/offer.entity';

@Injectable()
export class OffersService {
  constructor(
    @InjectRepository(Offer)
    private readonly offersRepository: Repository<Offer>,
  ) {}

  create(dto: CreateOfferDto): Promise<Offer> {
    const offer = this.offersRepository.create({
      applicationId: dto.applicationId,
      salary: dto.salary,
      startDate: dto.startDate,
      benefits: dto.benefits ?? [],
      letterText: dto.letterText ?? null,
      status: OfferStatus.DRAFT,
    });
    return this.offersRepository.save(offer);
  }

  async findById(id: string): Promise<Offer> {
    const offer = await this.offersRepository.findOne({ where: { id } });
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }
    return offer;
  }

  /**
   * The only way an offer's status becomes `sent`. Requires explicit
   * recruiter action — the AI-drafted letter is never sent automatically.
   */
  async approveAndSend(id: string): Promise<Offer> {
    const offer = await this.findById(id);
    if (offer.status !== OfferStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot send an offer in status '${offer.status}'; only 'draft' offers can be sent.`,
      );
    }
    if (!offer.letterText) {
      throw new BadRequestException(
        'Offer has no letter text — draft one via POST /ai/offer-letter first',
      );
    }
    offer.status = OfferStatus.SENT;
    return this.offersRepository.save(offer);
  }

  async respond(
    id: string,
    response: 'accepted' | 'rejected' | 'negotiating',
    counterOffer?: string,
  ): Promise<Offer> {
    const offer = await this.findById(id);
    if (offer.status !== OfferStatus.SENT) {
      throw new BadRequestException(
        `Cannot respond to an offer in status '${offer.status}'; it must be 'sent' first.`,
      );
    }
    offer.status =
      response === 'accepted'
        ? OfferStatus.ACCEPTED
        : response === 'rejected'
          ? OfferStatus.REJECTED
          : OfferStatus.NEGOTIATING;
    offer.counterOffer = response === 'negotiating' ? (counterOffer ?? null) : null;
    return this.offersRepository.save(offer);
  }
}
