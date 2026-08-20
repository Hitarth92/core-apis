import { AutoMap } from '@automapper/classes';
import { EStockTransferRequestStatus } from '../../../shared/enums/e-stock-transfer-request-status';

export class StockTransferRequest {
  @AutoMap() public id: string;
  @AutoMap() public organizationId: string;
  @AutoMap() public requestingLocationId: string;
  @AutoMap() public requestingUserId?: string;
  @AutoMap() public productId: string;
  @AutoMap() public variantId?: string;
  @AutoMap() public quantityRequested: number;
  @AutoMap(() => String) public status: EStockTransferRequestStatus;
  @AutoMap() public acceptedByLocationId?: string;
  @AutoMap() public acceptedByUserId?: string;
  @AutoMap(() => Date) public acceptedAt?: Date;
  @AutoMap(() => Date) public claimedAt?: Date;
  @AutoMap() public cancelledByUserId?: string;
  @AutoMap(() => Date) public cancelledAt?: Date;
  @AutoMap() public fulfillmentTransferId?: string;
  @AutoMap(() => Date) public createdAt?: Date;
  @AutoMap(() => Date) public updatedAt?: Date;
}
