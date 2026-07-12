import {
  Body,
  Controller,
  Delete,
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
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JobStatus } from '../../common/enums/job-status.enum';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateJobPostingDto } from './dto/create-job-posting.dto';
import {
  JobPostingResponseDto,
  JobPostingStatsDto,
} from './dto/job-posting-response.dto';
import {
  UpdateJobPostingDto,
  UpdateJobStatusDto,
} from './dto/update-job-posting.dto';
import { JobsService } from './jobs.service';

@ApiTags('Job Postings')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get('public')
  @ApiOperation({ summary: 'List published job postings (public browsing)' })
  @ApiOkResponse({ type: [JobPostingResponseDto] })
  async findPublished(): Promise<JobPostingResponseDto[]> {
    const jobs = await this.jobsService.findPublished();
    return jobs.map(JobPostingResponseDto.fromEntity);
  }

  @Get('public/:id')
  @ApiOperation({ summary: 'Get a single published job posting (public)' })
  @ApiOkResponse({ type: JobPostingResponseDto })
  async findPublishedOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<JobPostingResponseDto> {
    return JobPostingResponseDto.fromEntity(
      await this.jobsService.findPublishedById(id),
    );
  }

  @Get()
  @ApiBearerAuth('access-token')
  @Roles(Role.RECRUITER, Role.HIRING_MANAGER, Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiQuery({ name: 'status', enum: JobStatus, required: false })
  @ApiOperation({
    summary:
      'List all job postings including draft/closed/archived (internal only)',
  })
  @ApiOkResponse({ type: [JobPostingResponseDto] })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async findAllInternal(
    @Query('status') status?: JobStatus,
  ): Promise<JobPostingResponseDto[]> {
    const jobs = await this.jobsService.findAllInternal(status);
    return jobs.map(JobPostingResponseDto.fromEntity);
  }

  @Get(':id')
  @ApiBearerAuth('access-token')
  @Roles(Role.RECRUITER, Role.HIRING_MANAGER, Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get any job posting by id, any status (internal)' })
  @ApiOkResponse({ type: JobPostingResponseDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<JobPostingResponseDto> {
    return JobPostingResponseDto.fromEntity(
      await this.jobsService.findById(id),
    );
  }

  @Get(':id/stats')
  @ApiBearerAuth('access-token')
  @Roles(Role.RECRUITER, Role.HIRING_MANAGER, Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary:
      'Aggregate stats: total applications, per-stage counts, days open',
  })
  @ApiOkResponse({ type: JobPostingStatsDto })
  getStats(@Param('id', ParseUUIDPipe) id: string): Promise<JobPostingStatsDto> {
    return this.jobsService.getStats(id);
  }

  @Post()
  @ApiBearerAuth('access-token')
  @Roles(Role.RECRUITER, Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Create a job posting (starts as draft)' })
  @ApiOkResponse({ type: JobPostingResponseDto })
  async create(
    @Body() dto: CreateJobPostingDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<JobPostingResponseDto> {
    return JobPostingResponseDto.fromEntity(
      await this.jobsService.create(dto, user.userId),
    );
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @Roles(Role.RECRUITER, Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Edit a job posting (creator or ADMIN only)' })
  @ApiOkResponse({ type: JobPostingResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobPostingDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<JobPostingResponseDto> {
    const job = await this.jobsService.findById(id);
    this.jobsService.assertCanManage(job, user.userId, user.role as Role);
    return JobPostingResponseDto.fromEntity(
      await this.jobsService.update(id, dto),
    );
  }

  @Patch(':id/status')
  @ApiBearerAuth('access-token')
  @Roles(Role.RECRUITER, Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary:
      'Transition job status: draft→published→closed→archived (forward only)',
  })
  @ApiOkResponse({ type: JobPostingResponseDto })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<JobPostingResponseDto> {
    const job = await this.jobsService.findById(id);
    this.jobsService.assertCanManage(job, user.userId, user.role as Role);
    return JobPostingResponseDto.fromEntity(
      await this.jobsService.transitionStatus(id, dto.status),
    );
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @Roles(Role.RECRUITER, Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Delete a job posting (creator or ADMIN only)' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    const job = await this.jobsService.findById(id);
    this.jobsService.assertCanManage(job, user.userId, user.role as Role);
    await this.jobsService.remove(id);
    return { message: 'Job posting deleted' };
  }
}
