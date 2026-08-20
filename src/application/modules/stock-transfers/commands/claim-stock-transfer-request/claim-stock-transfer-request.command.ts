import { AutoMap } from '@automapper/classes';
import { CommandBase } from '../../../../../common';

export class ClaimStockTransferRequestCommand extends CommandBase {
  @AutoMap() public requestId: string;
  @AutoMap() public organizationId: string;
  @AutoMap() public claimingUserId?: string;
}
