import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ApplicationsService } from '../applications/applications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { InterviewsService } from './interviews.service';

const REMINDER_WINDOW_HOURS = 24;
/** Scan window padding so a 15-minute tick can't miss an interview between runs. */
const SCAN_WINDOW_MINUTES = 15;

/**
 * Every 15 minutes, finds confirmed interviews starting in ~24h that haven't
 * had a reminder sent yet, and emits `interview.reminder` to both the
 * candidate and the hiring manager via the notifications gateway.
 */
@Injectable()
export class InterviewReminderCron {
  private readonly logger = new Logger(InterviewReminderCron.name);

  constructor(
    private readonly interviewsService: InterviewsService,
    private readonly applicationsService: ApplicationsService,
    private readonly notifications: NotificationsGateway,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async sendDueReminders(): Promise<void> {
    const now = Date.now();
    const from = new Date(now + REMINDER_WINDOW_HOURS * 60 * 60 * 1000);
    const to = new Date(from.getTime() + SCAN_WINDOW_MINUTES * 60 * 1000);

    const due = await this.interviewsService.findUpcomingNeedingReminder(from, to);
    for (const interview of due) {
      const application = await this.applicationsService.findById(
        interview.applicationId,
      );
      this.notifications.emitInterviewReminder(
        application.candidateId,
        interview.hiringManagerId,
        interview.id,
        interview.confirmedSlot as Date,
      );
      await this.interviewsService.markReminderSent(interview.id);
      this.logger.log(`Reminder sent for interview ${interview.id}`);
    }
  }
}
