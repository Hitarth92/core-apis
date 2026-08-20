import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1786372800000 implements MigrationInterface {
  name = 'Migration1786372800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "core"."customers_customer_type_enum" AS ENUM('regular', 'new', 'shop', 'big_customer');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`ALTER TABLE "core"."customers" ADD COLUMN IF NOT EXISTS "customer_type" "core"."customers_customer_type_enum"`);
    await queryRunner.query(`ALTER TABLE "core"."customers" ADD COLUMN IF NOT EXISTS "discount_percent" numeric(5,2)`);
    await queryRunner.query(`ALTER TABLE "core"."customers" ADD COLUMN IF NOT EXISTS "skip_over_limit_approval" boolean`);

    await queryRunner.query(`CREATE TABLE "core"."quick_charges" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "organization_id" uuid NOT NULL,
      "label" character varying(100) NOT NULL,
      "amount" numeric(18,4) NOT NULL,
      "enabled" boolean NOT NULL DEFAULT true,
      "sort_order" integer NOT NULL DEFAULT 0,
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP DEFAULT now(),
      CONSTRAINT "PK_quick_charges" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(`ALTER TABLE "core"."quick_charges" ADD CONSTRAINT "FK__quick_charges__organizations" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

    await queryRunner.query(`CREATE TABLE "core"."customer_type_rules" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "organization_id" uuid NOT NULL,
      "customer_type" character varying(32) NOT NULL,
      "discount_percent" numeric(5,2) NOT NULL DEFAULT 0,
      "default_credit_limit" numeric(18,4),
      "skip_over_limit_approval" boolean NOT NULL DEFAULT false,
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP DEFAULT now(),
      CONSTRAINT "PK_customer_type_rules" PRIMARY KEY ("id"),
      CONSTRAINT "UQ__customer_type_rules__org_type" UNIQUE ("organization_id", "customer_type")
    )`);
    await queryRunner.query(`ALTER TABLE "core"."customer_type_rules" ADD CONSTRAINT "FK__customer_type_rules__organizations" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "core"."customer_type_rules" DROP CONSTRAINT "FK__customer_type_rules__organizations"`);
    await queryRunner.query(`DROP TABLE "core"."customer_type_rules"`);
    await queryRunner.query(`ALTER TABLE "core"."quick_charges" DROP CONSTRAINT "FK__quick_charges__organizations"`);
    await queryRunner.query(`DROP TABLE "core"."quick_charges"`);
    await queryRunner.query(`ALTER TABLE "core"."customers" DROP COLUMN IF EXISTS "skip_over_limit_approval"`);
    await queryRunner.query(`ALTER TABLE "core"."customers" DROP COLUMN IF EXISTS "discount_percent"`);
  }
}
