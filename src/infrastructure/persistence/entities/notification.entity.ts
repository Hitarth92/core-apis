import { AutoMap } from '@automapper/classes';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CORE_SCHEMA, ECoreTableName } from './e-core-table-name';
import { UserEntity } from './user.entity';
import { OrganizationEntity } from './organization.entity';

const PK_NAME = 'PK_' + ECoreTableName.Notifications;

@Entity({ schema: CORE_SCHEMA, name: ECoreTableName.Notifications })
export class NotificationEntity {
  @AutoMap()
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: PK_NAME })
  public id: string;

  @AutoMap()
  @Column({ name: 'user_id', type: 'uuid' })
  public userId: string;

  @AutoMap()
  @Column({ name: 'org_id', type: 'uuid' })
  public orgId: string;

  @AutoMap()
  @Column({ type: 'varchar', length: 50 })
  public type: string;

  @AutoMap()
  @Column({ type: 'varchar', length: 255 })
  public title: string;

  @AutoMap()
  @Column({ type: 'text' })
  public body: string;

  @AutoMap(() => Date)
  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  public readAt?: Date;

  @AutoMap(() => Date)
  @CreateDateColumn({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt: Date;

  // ─── Relations ──────────────────────────────────────────────────────────────

  @AutoMap(() => UserEntity)
  @ManyToOne(() => UserEntity)
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: `FK__${ECoreTableName.Notifications}__${ECoreTableName.Users}`,
  })
  public user: UserEntity;

  @AutoMap(() => OrganizationEntity)
  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({
    name: 'org_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: `FK__${ECoreTableName.Notifications}__${ECoreTableName.Organizations}`,
  })
  public organization: OrganizationEntity;
}
