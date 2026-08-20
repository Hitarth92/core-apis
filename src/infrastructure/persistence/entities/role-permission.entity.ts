import { AutoMap } from '@automapper/classes';
import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { CORE_SCHEMA, ECoreTableName } from './e-core-table-name';
import { RoleEntity } from './role.entity';
import { PermissionEntity } from './permission.entity';

@Entity({ schema: CORE_SCHEMA, name: ECoreTableName.RolePermissions })
export class RolePermissionEntity {
  @AutoMap()
  @PrimaryColumn({ name: 'role_id', type: 'uuid' })
  public roleId: string;

  @AutoMap()
  @PrimaryColumn({ name: 'permission_id', type: 'uuid' })
  public permissionId: string;

  // ─── Relations ──────────────────────────────────────────────────────────────

  @AutoMap(() => RoleEntity)
  @ManyToOne(() => RoleEntity)
  @JoinColumn({
    name: 'role_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: `FK__${ECoreTableName.RolePermissions}__${ECoreTableName.Roles}`,
  })
  public role: RoleEntity;

  @AutoMap(() => PermissionEntity)
  @ManyToOne(() => PermissionEntity)
  @JoinColumn({
    name: 'permission_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: `FK__${ECoreTableName.RolePermissions}__${ECoreTableName.Permissions}`,
  })
  public permission: PermissionEntity;
}
