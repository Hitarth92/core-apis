import { AutoMap } from '@automapper/classes';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { CORE_SCHEMA, ECoreTableName } from './e-core-table-name';
import { numericTransformer } from './numeric.transformer';
import { OrganizationEntity } from './organization.entity';

const PK_NAME = 'PK_' + ECoreTableName.QuickCharges;

@Entity({ schema: CORE_SCHEMA, name: ECoreTableName.QuickCharges })
export class QuickChargeEntity {
  @AutoMap()
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: PK_NAME })
  public id: string;

  @AutoMap()
  @Column({ type: 'uuid' })
  public organizationId: string;

  @AutoMap()
  @Column({ type: 'varchar', length: 100 })
  public label: string;

  @AutoMap()
  @Column({ type: 'decimal', precision: 18, scale: 4, transformer: numericTransformer })
  public amount: number;

  @AutoMap()
  @Column({ type: 'boolean', default: true })
  public enabled: boolean;

  @AutoMap()
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  public sortOrder: number;

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
    foreignKeyConstraintName: `FK__${ECoreTableName.QuickCharges}__${ECoreTableName.Organizations}`,
  })
  public organization: OrganizationEntity;
}
