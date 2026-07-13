import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OfferStatus } from '../../common/enums/offer-status.enum';
import { ApplicationsService } from '../applications/applications.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { Offer } from './entities/offer.entity';

@Injectable()
export class OffersService {
  constructor(
    @InjectRepository(Offer)
    private readonly offersRepository: Repository<Offer>,
    private readonly applicationsService: ApplicationsService,
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
   * Offers awaiting this candidate's response (status SENT), across all of
   * their applications. Backs the "My Applications" view so a candidate can
   * respond directly from a button instead of having to discover and paste
   * an offer id from anywhere.
   */
  async findPendingForCandidate(candidateId: string): Promise<Offer[]> {
    const applications = await this.applicationsService.findAll(
      {},
      candidateId,
    );
    const applicationIds = applications.map((a) => a.id);
    if (applicationIds.length === 0) {
      return [];
    }
    return this.offersRepository
      .createQueryBuilder('offer')
      .where('offer.applicationId IN (:...applicationIds)', {
        applicationIds,
      })
      .andWhere('offer.status = :status', { status: OfferStatus.SENT })
      .getMany();
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
