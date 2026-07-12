import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Module 2: job_postings, applications, interviews.
 * Runs cleanly on top of Module 1's InitSchema migration.
 */
export class JobsPipelineInterviews1720100000000 implements MigrationInterface {
  name = 'JobsPipelineInterviews1720100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- job_postings -------------------------------------------------
    await queryRunner.query(`
      CREATE TYPE "job_postings_type_enum" AS ENUM (
        'full_time', 'part_time', 'contract'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "job_postings_status_enum" AS ENUM (
        'draft', 'published', 'closed', 'archived'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "job_postings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" character varying NOT NULL,
        "department" character varying NOT NULL,
        "type" "job_postings_type_enum" NOT NULL,
        "salary_band_min" integer NOT NULL,
        "salary_band_max" integer NOT NULL,
        "required_skills" text[] NOT NULL DEFAULT '{}',
        "responsibilities" text NOT NULL,
        "culture_notes" text,
        "status" "job_postings_status_enum" NOT NULL DEFAULT 'draft',
        "created_by" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_job_postings_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_job_postings_status" ON "job_postings" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_postings_created_by" ON "job_postings" ("created_by")`,
    );

    // ---- applications ---------------------------------------------------
    await queryRunner.query(`
      CREATE TYPE "applications_stage_enum" AS ENUM (
        'applied', 'screened', 'shortlisted', 'interview_scheduled',
        'offer', 'hired', 'rejected'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "applications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "job_posting_id" uuid NOT NULL,
        "candidate_id" uuid NOT NULL,
        "cv_url" character varying,
        "cv_extracted_text" text,
        "cover_letter" text,
        "years_of_experience" integer NOT NULL,
        "salary_expectation" integer,
        "availability_date" date,
        "stage" "applications_stage_enum" NOT NULL DEFAULT 'applied',
        "ai_score" integer,
        "ai_strengths" text[],
        "ai_gaps" text[],
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_applications_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_applications_job_posting_id" ON "applications" ("job_posting_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_applications_candidate_id" ON "applications" ("candidate_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_applications_stage" ON "applications" ("stage")`,
    );

    // ---- interviews -------------------------------------------------------
    await queryRunner.query(`
      CREATE TYPE "interviews_type_enum" AS ENUM (
        'technical', 'behavioural', 'final'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "interviews_status_enum" AS ENUM (
        'proposed', 'confirmed', 'cancelled'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "interviews" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "application_id" uuid NOT NULL,
        "proposed_slots" TIMESTAMP WITH TIME ZONE[] NOT NULL,
        "confirmed_slot" TIMESTAMP WITH TIME ZONE,
        "type" "interviews_type_enum" NOT NULL,
        "hiring_manager_id" uuid NOT NULL,
        "status" "interviews_status_enum" NOT NULL DEFAULT 'proposed',
        "reminder_sent_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_interviews_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_interviews_application_id" ON "interviews" ("application_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_interviews_hiring_manager_id" ON "interviews" ("hiring_manager_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_interviews_hiring_manager_id"`);
    await queryRunner.query(`DROP INDEX "IDX_interviews_application_id"`);
    await queryRunner.query(`DROP TABLE "interviews"`);
    await queryRunner.query(`DROP TYPE "interviews_status_enum"`);
    await queryRunner.query(`DROP TYPE "interviews_type_enum"`);

    await queryRunner.query(`DROP INDEX "IDX_applications_stage"`);
    await queryRunner.query(`DROP INDEX "IDX_applications_candidate_id"`);
    await queryRunner.query(`DROP INDEX "IDX_applications_job_posting_id"`);
    await queryRunner.query(`DROP TABLE "applications"`);
    await queryRunner.query(`DROP TYPE "applications_stage_enum"`);

    await queryRunner.query(`DROP INDEX "IDX_job_postings_created_by"`);
    await queryRunner.query(`DROP INDEX "IDX_job_postings_status"`);
    await queryRunner.query(`DROP TABLE "job_postings"`);
    await queryRunner.query(`DROP TYPE "job_postings_status_enum"`);
    await queryRunner.query(`DROP TYPE "job_postings_type_enum"`);
  }
}
