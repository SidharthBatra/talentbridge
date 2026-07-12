import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { RefreshToken } from './modules/auth/entities/refresh-token.entity';
import { User } from './modules/users/entities/user.entity';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { JobPosting } from './modules/jobs/entities/job-posting.entity';
import { JobsModule } from './modules/jobs/jobs.module';
import { Application } from './modules/applications/entities/application.entity';
import { ApplicationsModule } from './modules/applications/applications.module';
import { Interview } from './modules/interviews/entities/interview.entity';
import { InterviewsModule } from './modules/interviews/interviews.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('databaseUrl'),
        entities: [User, RefreshToken, JobPosting, Application, Interview],
        migrations: ['dist/migrations/*.js'],
        // Schema is owned by migrations, never auto-sync.
        synchronize: false,
        autoLoadEntities: true,
      }),
    }),
    UsersModule,
    AuthModule,
    JobsModule,
    ApplicationsModule,
    InterviewsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
