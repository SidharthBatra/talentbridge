import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MulterExceptionFilter } from '../../common/filters/multer-exception.filter';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { ApplicationsService } from './applications.service';
import { ApplicationQueryDto } from './dto/application-query.dto';
import { ApplicationResponseDto } from './dto/application-response.dto';
import { BulkActionDto } from './dto/bulk-action.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { CvParserService } from './cv-parser.service';
import { cvMulterOptions } from './cv-upload.config';

@ApiTags('Applications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly notifications: NotificationsGateway,
    private readonly cvParser: CvParserService,
  ) {}

  @Post()
  @Roles(Role.CANDIDATE)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Apply to a published job (CANDIDATE only)' })
  @ApiOkResponse({ type: ApplicationResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async create(
    @Body() dto: CreateApplicationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApplicationResponseDto> {
    return ApplicationResponseDto.fromEntity(
      await this.applicationsService.create(dto, user.userId),
    );
  }

  @Post(':id/cv')
  @Roles(Role.CANDIDATE)
  @UseGuards(RolesGuard)
  @UseFilters(MulterExceptionFilter)
  @UseInterceptors(FileInterceptor('file', cvMulterOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary:
      'Upload a CV PDF (max 5MB, PDF only) for one of the candidate\'s own ' +
      'applications; extracts and stores its text in cvExtractedText.',
  })
  @ApiOkResponse({ type: ApplicationResponseDto })
  async uploadCv(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApplicationResponseDto> {
    if (!file) {
      throw new BadRequestException('A PDF file is required');
    }
    const application = await this.applicationsService.findById(id);
    this.applicationsService.assertOwnedByCandidate(application, user.userId);

    const cvExtractedText = await this.cvParser.extractText(file.path);
    const updated = await this.applicationsService.setCv(
      id,
      file.path,
      cvExtractedText,
    );
    return ApplicationResponseDto.fromEntity(updated);
  }

  @Get()
  @ApiOperation({
    summary:
      'List applications. Recruiters/hiring managers/admin see everything ' +
      '(filterable); candidates only ever see their own applications.',
  })
  @ApiOkResponse({ type: [ApplicationResponseDto] })
  async findAll(
    @Query() query: ApplicationQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApplicationResponseDto[]> {
    const restrictTo = user.role === Role.CANDIDATE ? user.userId : undefined;
    const applications = await this.applicationsService.findAll(
      query,
      restrictTo,
    );
    return applications.map(ApplicationResponseDto.fromEntity);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single application' })
  @ApiOkResponse({ type: ApplicationResponseDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApplicationResponseDto> {
    const application = await this.applicationsService.findById(id);
    if (user.role === Role.CANDIDATE) {
      this.applicationsService.assertOwnedByCandidate(application, user.userId);
    }
    return ApplicationResponseDto.fromEntity(application);
  }

  @Patch(':id/stage')
  @Roles(Role.RECRUITER, Role.HIRING_MANAGER, Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary:
      'Move an application to a new stage. RECRUITER: applied→screened→' +
      'shortlisted. HIRING_MANAGER: shortlisted→interview_scheduled→offer→' +
      'hired/rejected. Wrong role or skipped stage is rejected.',
  })
  @ApiOkResponse({ type: ApplicationResponseDto })
  @ApiForbiddenResponse({ description: 'Role does not own this stage' })
  async updateStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStageDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApplicationResponseDto> {
    const application = await this.applicationsService.transitionStage(
      id,
      dto.stage,
      user.role as Role,
    );
    this.notifications.emitApplicationStageChanged(
      application.candidateId,
      application.id,
      application.stage,
    );
    return ApplicationResponseDto.fromEntity(application);
  }

  @Post('bulk-action')
  @Roles(Role.RECRUITER, Role.HIRING_MANAGER, Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary:
      'Advance or reject multiple applications in one call. Each id is ' +
      'evaluated independently — one failure does not abort the batch.',
  })
  async bulkAction(
    @Body() dto: BulkActionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ succeeded: string[]; failed: { id: string; reason: string }[] }> {
    const result = await this.applicationsService.bulkAction(
      dto.applicationIds,
      dto.action,
      user.role as Role,
    );
    for (const id of result.succeeded) {
      const application = await this.applicationsService.findById(id);
      this.notifications.emitApplicationStageChanged(
        application.candidateId,
        application.id,
        application.stage,
      );
    }
    return result;
  }
}
