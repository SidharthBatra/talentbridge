import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from '../applications/entities/application.entity';
import { JobPosting } from './entities/job-posting.entity';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({
  // `Application` is registered here too (read-only use in getStats) so
  // JobsModule doesn't need to import ApplicationsModule — avoids a
  // circular dependency since ApplicationsModule imports JobsModule for
  // publish-status validation.
  imports: [TypeOrmModule.forFeature([JobPosting, Application])],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
