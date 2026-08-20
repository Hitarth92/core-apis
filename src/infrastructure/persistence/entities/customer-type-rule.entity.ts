import { AutoMap } from '@automapper/classes';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import { CORE_SCHEMA, ECoreTableName } from './e-core-table-name';
import { ECustomerType } from './e-customer-type';
import { numericTransformer } from './numeric.transformer';
import { OrganizationEntity } from './organization.entity';

const PK_NAME = 'PK_' + ECoreTableName.CustomerTypeRules;

@Entity({ schema: CORE_SCHEMA, name: ECoreTableName.CustomerTypeRules })
@Unique('UQ__customer_type_rules__org_type', ['organizationId', 'customerType'])
export class CustomerTypeRuleEntity {
  @AutoMap()
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: PK_NAME })
  public id: string;

  @AutoMap()
  @Column({ type: 'uuid' })
  public organizationId: string;

  @AutoMap(() => String)
  @Column({ name: 'customer_type', type: 'varchar', length: 32 })
  public customerType: ECustomerType;

  @AutoMap()
  @Column({ name: 'discount_percent', type: 'decimal', precision: 5, scale: 2, default: 0, transformer: numericTransformer })
  public discountPercent: number;

  @AutoMap()
  @Column({ name: 'default_credit_limit', type: 'decimal', precision: 18, scale: 4, nullable: true, transformer: numericTransformer })
  public defaultCreditLimit?: number | null;

  @AutoMap()
  @Column({ name: 'skip_over_limit_approval', type: 'boolean', default: false })
  public skipOverLimitApproval: boolean;

  @AutoMap(() => Date)
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt: Date;

  @AutoMap(() => Date)
  @UpdateDateColumn({ type: 'timestamp', nullable: true, onUpdate: 'CURRENT_TIMESTAMP' })
  public updatedAt?: Date;

  @AutoMap(() => OrganizationEntity)
  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({
    name: 'organization_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: `FK__${ECoreTableName.CustomerTypeRules}__${ECoreTableName.Organizations}`,
  })
  public organization: OrganizationEntity;
}
