import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1787164266789 implements MigrationInterface {
    name = 'Migration1787164266789'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // await queryRunner.query(`CREATE TABLE "core"."stock_transfer_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "requesting_location_id" uuid NOT NULL, "requesting_user_id" uuid, "product_id" uuid NOT NULL, "variant_id" uuid, "quantity_requested" numeric(18,4) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'OPEN', "accepted_by_location_id" uuid, "accepted_by_user_id" uuid, "accepted_at" TIMESTAMP, "claimed_at" TIMESTAMP, "cancelled_by_user_id" uuid, "cancelled_at" TIMESTAMP, "fulfillment_transfer_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_stock_transfer_requests" PRIMARY KEY ("id"))`);
        // await queryRunner.query(`ALTER TABLE "core"."stock_transfer_requests" ADD CONSTRAINT "FK__stock_transfer_requests__organizations" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE "core"."stock_transfer_requests" ADD CONSTRAINT "FK__stock_transfer_requests__requesting_locations" FOREIGN KEY ("requesting_location_id") REFERENCES "core"."locations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE "core"."stock_transfer_requests" ADD CONSTRAINT "FK__stock_transfer_requests__accepted_locations" FOREIGN KEY ("accepted_by_location_id") REFERENCES "core"."locations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE "core"."stock_transfer_requests" ADD CONSTRAINT "FK__stock_transfer_requests__requesting_users" FOREIGN KEY ("requesting_user_id") REFERENCES "core"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE "core"."stock_transfer_requests" ADD CONSTRAINT "FK__stock_transfer_requests__accepted_users" FOREIGN KEY ("accepted_by_user_id") REFERENCES "core"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE "core"."stock_transfer_requests" ADD CONSTRAINT "FK__stock_transfer_requests__products" FOREIGN KEY ("product_id") REFERENCES "core"."products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE "core"."stock_transfer_requests" ADD CONSTRAINT "FK__stock_transfer_requests__stock_transfers" FOREIGN KEY ("fulfillment_transfer_id") REFERENCES "core"."stock_transfers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core"."stock_transfer_requests" DROP CONSTRAINT "FK__stock_transfer_requests__stock_transfers"`);
        await queryRunner.query(`ALTER TABLE "core"."stock_transfer_requests" DROP CONSTRAINT "FK__stock_transfer_requests__products"`);
        await queryRunner.query(`ALTER TABLE "core"."stock_transfer_requests" DROP CONSTRAINT "FK__stock_transfer_requests__accepted_users"`);
        await queryRunner.query(`ALTER TABLE "core"."stock_transfer_requests" DROP CONSTRAINT "FK__stock_transfer_requests__requesting_users"`);
        await queryRunner.query(`ALTER TABLE "core"."stock_transfer_requests" DROP CONSTRAINT "FK__stock_transfer_requests__accepted_locations"`);
        await queryRunner.query(`ALTER TABLE "core"."stock_transfer_requests" DROP CONSTRAINT "FK__stock_transfer_requests__requesting_locations"`);
        await queryRunner.query(`ALTER TABLE "core"."stock_transfer_requests" DROP CONSTRAINT "FK__stock_transfer_requests__organizations"`);
        await queryRunner.query(`DROP TABLE "core"."stock_transfer_requests"`);
    }

}
