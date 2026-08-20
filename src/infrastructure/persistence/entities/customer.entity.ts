import { AutoMap } from '@automapper/classes';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { CORE_SCHEMA, ECoreTableName } from './e-core-table-name';
import { ECustomerType } from './e-customer-type';
import { numericTransformer } from './numeric.transformer';
import { OrganizationEntity } from './organization.entity';

const PK_NAME = 'PK_' + ECoreTableName.Customers;

@Entity({ schema: CORE_SCHEMA, name: ECoreTableName.Customers })
export class CustomerEntity {
  @AutoMap()
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: PK_NAME })
  public id: string;

  @AutoMap()
  @Column({ type: 'uuid' })
  public organizationId: string;

  @AutoMap()
  @Column({ type: 'varchar', length: 255 })
  public name: string;

  @AutoMap()
  @Column({ type: 'varchar', length: 255, nullable: true })
  public email?: string;

  @AutoMap()
  @Column({ type: 'varchar', length: 20, nullable: true })
  public phone?: string;

  @AutoMap()
  @Column({ type: 'varchar', length: 50, nullable: true })
  public gstin?: string;

  @AutoMap()
  @Column({ name: 'credit_limit', type: 'decimal', precision: 18, scale: 4, nullable: true, transformer: numericTransformer })
  public creditLimit?: number;

  @AutoMap()
  @Column({ name: 'credit_balance', type: 'decimal', precision: 18, scale: 4, default: 0, transformer: numericTransformer })
  public creditBalance: number;

  @AutoMap(() => String)
  @Column({ name: 'customer_type', type: 'enum', enum: ECustomerType, nullable: true })
  public customerType?: ECustomerType;

  @AutoMap()
  @Column({ name: 'discount_percent', type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: numericTransformer })
  public discountPercent?: number | null;

  @AutoMap()
  @Column({ name: 'skip_over_limit_approval', type: 'boolean', nullable: true })
  public skipOverLimitApproval?: boolean | null;

  @AutoMap(() => Date)
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt: Date;

  @AutoMap(() => Date)
  @UpdateDateColumn({ type: 'timestamp', nullable: true, onUpdate: 'CURRENT_TIMESTAMP' })
  public updatedAt?: Date;

  @AutoMap(() => Date)
  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  public deletedAt?: Date;

  @AutoMap(() => OrganizationEntity)
  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({
    name: 'organization_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: `FK__${ECoreTableName.Customers}__${ECoreTableName.Organizations}`,
  })
  public organization: OrganizationEntity;
}
