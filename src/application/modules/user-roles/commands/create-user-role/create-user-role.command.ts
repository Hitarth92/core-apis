import { AutoMap } from '@automapper/classes';
import { CommandBase } from '../../../../../common';

export class CreateUserRoleCommand extends CommandBase {
  @AutoMap() public userId: string;
  @AutoMap() public roleId: string;
  @AutoMap() public locationId?: string;
  public organizationId?: string;
  public callerIsSuperAdmin: boolean;
}
