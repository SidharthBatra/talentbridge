import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';
import { User } from '../modules/users/entities/user.entity';
import { JobPosting } from '../modules/jobs/entities/job-posting.entity';
import { Application } from '../modules/applications/entities/application.entity';
import { Interview } from '../modules/interviews/entities/interview.entity';

loadEnv();

/**
 * Standalone TypeORM DataSource used by the CLI (migration:run/generate/revert)
 * and imported by AppModule for the runtime connection. Migrations are the
 * source of truth for schema — `synchronize` is always false.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  url:
    process.env.DATABASE_URL ??
    'postgres://talentbridge:talentbridge@localhost:5432/talentbridge',
  entities: [User, RefreshToken, JobPosting, Application, Interview],
  // __dirname-relative so a ts-node run (src/database) picks up src/migrations
  // and a compiled run (dist/database) picks up dist/migrations — never both.
  migrations: [__dirname + '/../migrations/*.{ts,js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : false,
});
