import { AutoMap } from '@automapper/classes';
import { CommandBase } from 'src/common';

export class SyncUserCommand extends CommandBase {
  @AutoMap() public clerkUserId: string;
  @AutoMap() public email: string;
  @AutoMap() public firstName: string;
  @AutoMap() public lastName: string;
  @AutoMap() public imageUrl?: string;
  @AutoMap() public organizationId?: string;
  @AutoMap() public roleId?: string;
  @AutoMap() public locationId?: string;
}
