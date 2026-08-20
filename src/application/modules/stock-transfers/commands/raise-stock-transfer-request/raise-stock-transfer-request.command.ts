import { AutoMap } from '@automapper/classes';
import { CommandBase } from '../../../../../common';

export class RaiseStockTransferRequestCommand extends CommandBase {
  @AutoMap() public organizationId: string;
  @AutoMap() public requestingLocationId: string;
  @AutoMap() public requestingUserId?: string;
  @AutoMap() public productId: string;
  @AutoMap() public variantId?: string;
  @AutoMap() public quantityRequested: number;
}
