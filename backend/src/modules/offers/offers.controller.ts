import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ApplicationsService } from '../applications/applications.service';
import { JobsService } from '../jobs/jobs.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { CreateOfferDto } from './dto/create-offer.dto';
import { OfferResponseDto } from './dto/offer-response.dto';
import { RespondOfferDto } from './dto/respond-offer.dto';
import { OffersService } from './offers.service';

@ApiTags('Offers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('offers')
export class OffersController {
  constructor(
    private readonly offersService: OffersService,
    private readonly applicationsService: ApplicationsService,
    private readonly jobsService: JobsService,
    private readonly notifications: NotificationsGateway,
  ) {}

  @Post()
  @Roles(Role.RECRUITER, Role.HIRING_MANAGER, Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create a draft offer for an application' })
  @ApiOkResponse({ type: OfferResponseDto })
  async create(@Body() dto: CreateOfferDto): Promise<OfferResponseDto> {
    // Ensures the application exists (404s otherwise) before drafting an offer against it.
    await this.applicationsService.findById(dto.applicationId);
    return OfferResponseDto.fromEntity(await this.offersService.create(dto));
  }

  @Get('mine/pending')
  @Roles(Role.CANDIDATE)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary:
      "Offers awaiting the current candidate's response, across all of " +
      'their applications — used to wire a "Respond" link directly to ' +
      'each pending offer without requiring an id to be typed in.',
  })
  @ApiOkResponse({ type: [OfferResponseDto] })
  async myPending(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OfferResponseDto[]> {
    const offers = await this.offersService.findPendingForCandidate(
      user.userId,
    );
    return offers.map(OfferResponseDto.fromEntity);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an offer' })
  @ApiOkResponse({ type: OfferResponseDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OfferResponseDto> {
    return OfferResponseDto.fromEntity(await this.offersService.findById(id));
  }

  @Post(':id/approve-and-send')
  @Roles(Role.RECRUITER, Role.HIRING_MANAGER, Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary:
      'Explicitly approve and send a draft offer. This is the ONLY way an ' +
      "offer's status becomes 'sent' — the AI-drafted letter is never sent automatically.",
  })
  @ApiOkResponse({ type: OfferResponseDto })
  async approveAndSend(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OfferResponseDto> {
    return OfferResponseDto.fromEntity(
      await this.offersService.approveAndSend(id),
    );
  }

  @Patch(':id/respond')
  @Roles(Role.CANDIDATE)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Candidate responds to a sent offer' })
  @ApiOkResponse({ type: OfferResponseDto })
  async respond(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RespondOfferDto,
  ): Promise<OfferResponseDto> {
    const offer = await this.offersService.respond(
      id,
      dto.response,
      dto.counterOffer,
    );

    const application = await this.applicationsService.findById(
      offer.applicationId,
    );
    const job = await this.jobsService.findById(application.jobPostingId);
    this.notifications.emitOfferResponded(
      job.createdBy,
      offer.id,
      application.id,
      dto.response,
    );

    return OfferResponseDto.fromEntity(offer);
  }
}
