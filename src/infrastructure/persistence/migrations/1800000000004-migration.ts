import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1800000000004 implements MigrationInterface {
  name = 'Migration1800000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "core"."customer_credit_transactions"
         ADD COLUMN "note" character varying(500),
         ADD COLUMN "payment_method" character varying(50)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "core"."customer_credit_transactions"
         DROP COLUMN IF EXISTS "payment_method",
         DROP COLUMN IF EXISTS "note"`,
    );
  }
}
