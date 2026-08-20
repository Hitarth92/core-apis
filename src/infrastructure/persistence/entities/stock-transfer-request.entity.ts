import { AutoMap } from '@automapper/classes';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CORE_SCHEMA, ECoreTableName } from './e-core-table-name';
import { OrganizationEntity } from './organization.entity';
import { LocationEntity } from './location.entity';
import { UserEntity } from './user.entity';
import { ProductEntity } from './product.entity';
import { StockTransferEntity } from './stock-transfer.entity';
import { EStockTransferRequestStatus } from '../../../application/shared/enums/e-stock-transfer-request-status';

const PK_NAME = 'PK_' + ECoreTableName.StockTransferRequests;

@Entity({ schema: CORE_SCHEMA, name: ECoreTableName.StockTransferRequests })
export class StockTransferRequestEntity {
  @AutoMap()
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: PK_NAME })
  public id: string;

  @AutoMap()
  @Column({ name: 'organization_id', type: 'uuid' })
  public organizationId: string;

  @AutoMap()
  @Column({ name: 'requesting_location_id', type: 'uuid' })
  public requestingLocationId: string;

  @AutoMap()
  @Column({ name: 'requesting_user_id', type: 'uuid', nullable: true })
  public requestingUserId?: string;

  @AutoMap()
  @Column({ name: 'product_id', type: 'uuid' })
  public productId: string;

  @AutoMap()
  @Column({ name: 'variant_id', type: 'uuid', nullable: true })
  public variantId?: string;

  @AutoMap()
  @Column({ name: 'quantity_requested', type: 'decimal', precision: 18, scale: 4 })
  public quantityRequested: number;

  @AutoMap(() => String)
  @Column({ type: 'varchar', length: 20, default: EStockTransferRequestStatus.Open })
  public status: EStockTransferRequestStatus;

  @AutoMap()
  @Column({ name: 'accepted_by_location_id', type: 'uuid', nullable: true })
  public acceptedByLocationId?: string;

  @AutoMap()
  @Column({ name: 'accepted_by_user_id', type: 'uuid', nullable: true })
  public acceptedByUserId?: string;

  @AutoMap(() => Date)
  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true })
  public acceptedAt?: Date;

  @AutoMap(() => Date)
  @Column({ name: 'claimed_at', type: 'timestamp', nullable: true })
  public claimedAt?: Date;

  @AutoMap()
  @Column({ name: 'cancelled_by_user_id', type: 'uuid', nullable: true })
  public cancelledByUserId?: string;

  @AutoMap(() => Date)
  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  public cancelledAt?: Date;

  @AutoMap()
  @Column({ name: 'fulfillment_transfer_id', type: 'uuid', nullable: true })
  public fulfillmentTransferId?: string;

  @AutoMap(() => Date)
  @CreateDateColumn({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt: Date;

  @AutoMap(() => Date)
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: true, onUpdate: 'CURRENT_TIMESTAMP' })
  public updatedAt?: Date;

  @AutoMap(() => Date)
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  public deletedAt?: Date;

  // ─── Relations ──────────────────────────────────────────────────────────────

  @AutoMap(() => OrganizationEntity)
  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({
    name: 'organization_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: `FK__${ECoreTableName.StockTransferRequests}__${ECoreTableName.Organizations}`,
  })
  public organization: OrganizationEntity;

  @AutoMap(() => LocationEntity)
  @ManyToOne(() => LocationEntity)
  @JoinColumn({
    name: 'requesting_location_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: `FK__${ECoreTableName.StockTransferRequests}__requesting_${ECoreTableName.Locations}`,
  })
  public requestingLocation: LocationEntity;

  @AutoMap(() => LocationEntity)
  @ManyToOne(() => LocationEntity, { nullable: true })
  @JoinColumn({
    name: 'accepted_by_location_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: `FK__${ECoreTableName.StockTransferRequests}__accepted_${ECoreTableName.Locations}`,
  })
  public acceptedByLocation?: LocationEntity;

  @AutoMap(() => UserEntity)
  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({
    name: 'requesting_user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: `FK__${ECoreTableName.StockTransferRequests}__requesting_${ECoreTableName.Users}`,
  })
  public requestingUser?: UserEntity;

  @AutoMap(() => UserEntity)
  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({
    name: 'accepted_by_user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: `FK__${ECoreTableName.StockTransferRequests}__accepted_${ECoreTableName.Users}`,
  })
  public acceptedByUser?: UserEntity;

  @AutoMap(() => ProductEntity)
  @ManyToOne(() => ProductEntity)
  @JoinColumn({
    name: 'product_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: `FK__${ECoreTableName.StockTransferRequests}__${ECoreTableName.Products}`,
  })
  public product: ProductEntity;

  @AutoMap(() => StockTransferEntity)
  @ManyToOne(() => StockTransferEntity, { nullable: true })
  @JoinColumn({
    name: 'fulfillment_transfer_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: `FK__${ECoreTableName.StockTransferRequests}__${ECoreTableName.StockTransfers}`,
  })
  public fulfillmentTransfer?: StockTransferEntity;
}
