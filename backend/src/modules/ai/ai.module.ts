import { Module } from '@nestjs/common';
import { ApplicationsModule } from '../applications/applications.module';
import { InterviewsModule } from '../interviews/interviews.module';
import { JobsModule } from '../jobs/jobs.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [ApplicationsModule, JobsModule, InterviewsModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
