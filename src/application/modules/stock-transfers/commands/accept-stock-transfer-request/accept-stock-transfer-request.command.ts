import { AutoMap } from '@automapper/classes';
import { CommandBase } from '../../../../../common';

export class AcceptStockTransferRequestCommand extends CommandBase {
  @AutoMap() public requestId: string;
  @AutoMap() public organizationId: string;
  @AutoMap() public acceptingLocationId: string;
  @AutoMap() public acceptingUserId?: string;
}
