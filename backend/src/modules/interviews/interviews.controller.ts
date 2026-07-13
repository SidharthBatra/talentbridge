import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
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
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { ConfirmSlotDto } from './dto/confirm-slot.dto';
import { InterviewResponseDto } from './dto/interview-response.dto';
import { ProposeInterviewDto } from './dto/propose-interview.dto';
import { ProposeSlotsDto } from './dto/propose-slots.dto';
import { InterviewsService } from './interviews.service';

@ApiTags('Interviews')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('interviews')
export class InterviewsController {
  constructor(
    private readonly interviewsService: InterviewsService,
    private readonly applicationsService: ApplicationsService,
    private readonly notifications: NotificationsGateway,
  ) {}

  @Post()
  @Roles(Role.RECRUITER, Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Propose interview slots for an application' })
  @ApiOkResponse({ type: InterviewResponseDto })
  async propose(
    @Body() dto: ProposeInterviewDto,
  ): Promise<InterviewResponseDto> {
    return InterviewResponseDto.fromEntity(
      await this.interviewsService.propose(dto),
    );
  }

  @Get('mine/pending')
  @Roles(Role.CANDIDATE)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary:
      "Interviews awaiting the current candidate's response, across all " +
      'of their applications — used to wire a "Respond" link directly to ' +
      'each pending interview without requiring an id to be typed in.',
  })
  @ApiOkResponse({ type: [InterviewResponseDto] })
  async myPending(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<InterviewResponseDto[]> {
    const interviews = await this.interviewsService.findPendingForCandidate(
      user.userId,
    );
    return interviews.map(InterviewResponseDto.fromEntity);
  }

  @Get('by-application/:applicationId')
  @Roles(Role.RECRUITER, Role.HIRING_MANAGER, Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary:
      'Interviews scheduled for a given application (newest first) — lets ' +
      'the UI attach a "prep"/"reschedule" action directly to an ' +
      'application card instead of requiring an interview id to be typed in.',
  })
  @ApiOkResponse({ type: [InterviewResponseDto] })
  async byApplication(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ): Promise<InterviewResponseDto[]> {
    const interviews =
      await this.interviewsService.findByApplicationId(applicationId);
    return interviews.map(InterviewResponseDto.fromEntity);
  }

  @Get('calendar')
  @ApiQuery({ name: 'userId', required: true, type: String })
  @ApiOperation({
    summary: 'Confirmed interviews for a user (as candidate or hiring manager)',
  })
  @ApiOkResponse({ type: [InterviewResponseDto] })
  async calendar(
    @Query('userId', ParseUUIDPipe) userId: string,
  ): Promise<InterviewResponseDto[]> {
    const interviews = await this.interviewsService.findCalendarForUser(userId);
    return interviews.map(InterviewResponseDto.fromEntity);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single interview' })
  @ApiOkResponse({ type: InterviewResponseDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InterviewResponseDto> {
    return InterviewResponseDto.fromEntity(
      await this.interviewsService.findById(id),
    );
  }

  @Patch(':id/confirm')
  @Roles(Role.CANDIDATE)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary:
      'Candidate confirms one of the proposed slots. Rejected if the ' +
      'hiring manager already has an overlapping confirmed interview.',
  })
  @ApiOkResponse({ type: InterviewResponseDto })
  async confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmSlotDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<InterviewResponseDto> {
    const interview = await this.interviewsService.confirmSlot(id, dto);
    const application = await this.applicationsService.findById(
      interview.applicationId,
    );
    this.notifications.emitApplicationStageChanged(
      application.candidateId,
      application.id,
      application.stage,
    );
    return InterviewResponseDto.fromEntity(interview);
  }

  @Patch(':id/request-alternatives')
  @Roles(Role.CANDIDATE)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Candidate declines proposed slots' })
  @ApiOkResponse({ type: InterviewResponseDto })
  async requestAlternatives(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InterviewResponseDto> {
    return InterviewResponseDto.fromEntity(
      await this.interviewsService.requestAlternatives(id),
    );
  }

  @Patch(':id/slots')
  @Roles(Role.RECRUITER, Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Recruiter offers a new set of slots' })
  @ApiOkResponse({ type: InterviewResponseDto })
  async proposeNewSlots(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProposeSlotsDto,
  ): Promise<InterviewResponseDto> {
    return InterviewResponseDto.fromEntity(
      await this.interviewsService.proposeNewSlots(id, dto),
    );
  }

  @Patch(':id/cancel')
  @Roles(Role.RECRUITER, Role.HIRING_MANAGER, Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Cancel an interview' })
  @ApiOkResponse({ type: InterviewResponseDto })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InterviewResponseDto> {
    return InterviewResponseDto.fromEntity(
      await this.interviewsService.cancel(id),
    );
  }
}
