import { AutoMap } from '@automapper/classes';
import { CommandBase } from '../../../../../common';

export class CancelStockTransferRequestCommand extends CommandBase {
  @AutoMap() public requestId: string;
  @AutoMap() public organizationId: string;
  @AutoMap() public cancelledByUserId?: string;
}
