import { AutoMap } from '@automapper/classes';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CORE_SCHEMA, ECoreTableName } from './e-core-table-name';
import { numericTransformer } from './numeric.transformer';
import { CustomerEntity } from './customer.entity';
import { BillEntity } from './bill.entity';
import { UserEntity } from './user.entity';

const PK_NAME = 'PK_' + ECoreTableName.CustomerCreditTransactions;

export enum ECreditTransactionType {
  CreditSale = 'credit_sale',
  Payment    = 'payment',
  Adjustment = 'adjustment',
}

@Entity({ schema: CORE_SCHEMA, name: ECoreTableName.CustomerCreditTransactions })
export class CustomerCreditTransactionEntity {
  @AutoMap()
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: PK_NAME })
  public id: string;

  @AutoMap()
  @Column({ name: 'customer_id', type: 'uuid' })
  public customerId: string;

  @AutoMap()
  @Column({ name: 'bill_id', type: 'uuid', nullable: true })
  public billId?: string;

  @AutoMap(() => String)
  @Column({ name: 'type', type: 'enum', enum: ECreditTransactionType })
  public type: ECreditTransactionType;

  @AutoMap()
  @Column({ type: 'decimal', precision: 18, scale: 4, transformer: numericTransformer })
  public amount: number;

  @AutoMap()
  @Column({ name: 'balance_before', type: 'decimal', precision: 18, scale: 4, transformer: numericTransformer })
  public balanceBefore: number;

  @AutoMap()
  @Column({ name: 'balance_after', type: 'decimal', precision: 18, scale: 4, transformer: numericTransformer })
  public balanceAfter: number;

  @AutoMap()
  @Column({ name: 'performed_by_id', type: 'uuid', nullable: true })
  public performedById?: string;

  @AutoMap()
  @Column({ name: 'payment_method', type: 'varchar', length: 50, nullable: true })
  public paymentMethod?: string;

  @AutoMap()
  @Column({ name: 'note', type: 'varchar', length: 500, nullable: true })
  public note?: string;

  @AutoMap(() => Date)
  @CreateDateColumn({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt: Date;

  @AutoMap(() => CustomerEntity)
  @ManyToOne(() => CustomerEntity)
  @JoinColumn({
    name: 'customer_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: `FK__${ECoreTableName.CustomerCreditTransactions}__${ECoreTableName.Customers}`,
  })
  public customer: CustomerEntity;

  @AutoMap(() => BillEntity)
  @ManyToOne(() => BillEntity, { nullable: true })
  @JoinColumn({
    name: 'bill_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: `FK__${ECoreTableName.CustomerCreditTransactions}__${ECoreTableName.Bills}`,
  })
  public bill?: BillEntity;

  @AutoMap(() => UserEntity)
  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({
    name: 'performed_by_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: `FK__${ECoreTableName.CustomerCreditTransactions}__${ECoreTableName.Users}`,
  })
  public performedBy?: UserEntity;
}
