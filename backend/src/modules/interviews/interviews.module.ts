import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationsModule } from '../applications/applications.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { InterviewReminderCron } from './interview-reminder.cron';
import { Interview } from './entities/interview.entity';
import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Interview]),
    ApplicationsModule,
    NotificationsModule,
  ],
  controllers: [InterviewsController],
  providers: [InterviewsService, InterviewReminderCron],
  exports: [InterviewsService],
})
export class InterviewsModule {}
