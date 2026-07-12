import {
  Body,
  Controller,
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
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ApplicationsService } from '../applications/applications.service';
import { InterviewsService } from '../interviews/interviews.service';
import { JobsService } from '../jobs/jobs.service';
import { AiService } from './ai.service';
import {
  CvScoreResponseDto,
} from './dto/cv-score-response.dto';
import {
  GenerateInterviewQuestionsDto,
  InterviewQuestionDto,
  InterviewQuestionsResponseDto,
  UpdateInterviewQuestionsDto,
} from './dto/interview-questions.dto';
import {
  GenerateJobDescriptionDto,
  JobDescriptionResponseDto,
} from './dto/job-description.dto';
import {
  GenerateOfferLetterDto,
  OfferLetterResponseDto,
} from './dto/offer-letter.dto';
import { INTERVIEW_QUESTION_FALLBACKS } from './interview-question-fallbacks';
import {
  buildCvScorePrompt,
  buildInterviewQuestionsPrompt,
  buildJobDescriptionPrompt,
  buildOfferLetterPrompt,
} from './prompts';

@ApiTags('AI')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly applicationsService: ApplicationsService,
    private readonly jobsService: JobsService,
    private readonly interviewsService: InterviewsService,
  ) {}

  // ---- Feature 1: Job Description Generator --------------------------------

  @Post('job-description')
  @Roles(Role.RECRUITER, Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary:
      'Generate a structured, inclusive job description. Call again with the ' +
      'same inputs to regenerate — no special flag needed.',
  })
  @ApiOkResponse({ type: JobDescriptionResponseDto })
  async generateJobDescription(
    @Body() dto: GenerateJobDescriptionDto,
  ): Promise<JobDescriptionResponseDto> {
    const prompt = buildJobDescriptionPrompt(dto);
    const result = await this.aiService.generateJson<
      Omit<JobDescriptionResponseDto, 'isFallback'>
    >(prompt);

    if (result.ok) {
      return { ...result.data, isFallback: false };
    }

    // Fallback: a blank, clearly-labelled template the recruiter can fill in
    // by hand rather than a hard error blocking job creation.
    return {
      roleSummary: `[AI unavailable — draft manually] ${dto.jobTitle} on the ${dto.department} team.`,
      keyResponsibilities: ['[Add key responsibility]'],
      requiredQualifications: dto.requiredSkills.map((s) => `Experience with ${s}`),
      preferredQualifications: ['[Add preferred qualification]'],
      whatWeOffer: ['[Add compensation/benefits/culture details]'],
      isFallback: true,
    };
  }

  // ---- Feature 2: CV Screening & Scorer -------------------------------------

  @Post('cv-score/:applicationId')
  @Roles(Role.RECRUITER, Role.HIRING_MANAGER, Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary:
      "Score a candidate's CV against their job posting and persist the " +
      'result onto the application (aiScore/aiStrengths/aiGaps).',
  })
  @ApiOkResponse({ type: CvScoreResponseDto })
  async scoreCv(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ): Promise<CvScoreResponseDto> {
    const application = await this.applicationsService.findById(applicationId);
    const job = await this.jobsService.findById(application.jobPostingId);

    if (!application.cvExtractedText) {
      return {
        scored: false,
        message: 'No CV text has been extracted for this application yet.',
      };
    }

    const prompt = buildCvScorePrompt({
      cvExtractedText: application.cvExtractedText,
      jobTitle: job.title,
      requiredSkills: job.requiredSkills,
      responsibilities: job.responsibilities,
    });

    type ScoreShape = {
      candidateName: string;
      yearsOfExperience: number;
      topSkills: string[];
      educationLevel: string;
      lastRole: string;
      matchScore: number;
      topStrengths: string[];
      topGaps: string[];
    };
    const result = await this.aiService.generateJson<ScoreShape>(prompt);

    if (!result.ok) {
      // DESIGNATED graceful-degradation feature (see PROMPTS.md / README):
      // aiScore is left null rather than defaulted to 0 or guessed, and we
      // return scored=false instead of a 500. A CV-screening failure must
      // never remove a candidate from a human recruiter's view — the
      // application still exists, still shows in GET /applications, and a
      // human can screen it manually. Silently failing the whole request
      // (or hiding the application) would be worse than an honest
      // "needs manual review" signal.
      return {
        scored: false,
        message: `AI scoring unavailable (${result.reason}) — this application requires manual review.`,
      };
    }

    const { data } = result;
    await this.applicationsService.setAiScore(
      applicationId,
      data.matchScore,
      data.topStrengths,
      data.topGaps,
    );

    return { scored: true, ...data };
  }

  // ---- Feature 3: Interview Question Suggester ------------------------------

  @Post('interview-questions')
  @Roles(Role.RECRUITER, Role.HIRING_MANAGER, Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary:
      'Suggest interview questions for an application, tailored to the job ' +
      "and the candidate's CV.",
  })
  @ApiOkResponse({ type: InterviewQuestionsResponseDto })
  async generateInterviewQuestions(
    @Body() dto: GenerateInterviewQuestionsDto,
  ): Promise<InterviewQuestionsResponseDto> {
    const application = await this.applicationsService.findById(
      dto.applicationId,
    );
    const job = await this.jobsService.findById(application.jobPostingId);

    const prompt = buildInterviewQuestionsPrompt({
      jobTitle: job.title,
      responsibilities: job.responsibilities,
      requiredSkills: job.requiredSkills,
      cvSummary: application.cvExtractedText ?? 'No CV text available.',
      interviewType: dto.interviewType,
    });

    const result = await this.aiService.generateJson<{
      questions: InterviewQuestionDto[];
    }>(prompt);

    if (result.ok) {
      return { questions: result.data.questions, isFallback: false };
    }

    return {
      questions: INTERVIEW_QUESTION_FALLBACKS[dto.interviewType],
      isFallback: true,
    };
  }

  @Patch('interview-questions/:interviewId')
  @Roles(Role.RECRUITER, Role.HIRING_MANAGER, Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary:
      "Persist the hiring manager's final edited question list onto the interview.",
  })
  async updateInterviewQuestions(
    @Param('interviewId', ParseUUIDPipe) interviewId: string,
    @Body() dto: UpdateInterviewQuestionsDto,
  ) {
    const interview = await this.interviewsService.setQuestions(
      interviewId,
      dto.questions,
    );
    return { interviewId: interview.id, questions: interview.questions };
  }

  // ---- Feature 4: Offer Letter Drafter (bonus) ------------------------------

  @Post('offer-letter')
  @Roles(Role.RECRUITER, Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary:
      'Draft a formal offer letter. This does NOT send the offer — call ' +
      'POST /offers/:id/approve-and-send to do that explicitly.',
  })
  @ApiOkResponse({ type: OfferLetterResponseDto })
  async generateOfferLetter(
    @Body() dto: GenerateOfferLetterDto,
  ): Promise<OfferLetterResponseDto> {
    const prompt = buildOfferLetterPrompt(dto);
    const result = await this.aiService.generateJson<{ letterText: string }>(
      prompt,
    );

    if (result.ok) {
      return { letterText: result.data.letterText, isFallback: false };
    }

    return {
      letterText:
        `[AI unavailable — draft manually]\n\n` +
        `Dear ${dto.candidateName},\n\n` +
        `We are pleased to offer you the position of ${dto.roleTitle} at ${dto.companyName}, ` +
        `starting ${dto.startDate}, with an annual salary of ${dto.salary} and a ` +
        `${dto.probationPeriod} probation period.\n\n` +
        `Benefits: ${dto.benefits.join(', ') || '[list benefits]'}\n\n` +
        `[Add conditions of employment and acceptance instructions]`,
      isFallback: true,
    };
  }
}
