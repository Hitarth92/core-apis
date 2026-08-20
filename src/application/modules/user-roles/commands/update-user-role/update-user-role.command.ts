import { AutoMap } from '@automapper/classes';
import { CommandBase } from '../../../../../common';

export class UpdateUserRoleCommand extends CommandBase {
  @AutoMap() public id: string;
  @AutoMap() public roleId?: string;
  @AutoMap() public locationId?: string;
  public organizationId?: string;
  public callerIsSuperAdmin: boolean;
}
