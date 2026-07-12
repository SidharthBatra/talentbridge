import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Module 3: `interviews.questions` (AI-suggested, hiring-manager-edited
 * question list) and the `offers` table (AI-drafted letters, explicit
 * approve-and-send gate). Runs cleanly on top of Module 2's migration.
 */
export class AiOffersAndInterviewQuestions1720200000000
  implements MigrationInterface
{
  name = 'AiOffersAndInterviewQuestions1720200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "interviews" ADD "questions" jsonb`,
    );

    await queryRunner.query(`
      CREATE TYPE "offers_status_enum" AS ENUM (
        'draft', 'sent', 'accepted', 'rejected', 'negotiating'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "offers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "application_id" uuid NOT NULL,
        "salary" integer NOT NULL,
        "start_date" date NOT NULL,
        "benefits" text[] NOT NULL DEFAULT '{}',
        "letter_text" text,
        "status" "offers_status_enum" NOT NULL DEFAULT 'draft',
        "counter_offer" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_offers_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_offers_application_id" ON "offers" ("application_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_offers_application_id"`);
    await queryRunner.query(`DROP TABLE "offers"`);
    await queryRunner.query(`DROP TYPE "offers_status_enum"`);
    await queryRunner.query(`ALTER TABLE "interviews" DROP COLUMN "questions"`);
  }
}
