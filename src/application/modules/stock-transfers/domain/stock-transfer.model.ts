import { AutoMap } from '@automapper/classes';
import { EStockTransferStatus } from '../../../shared/enums/e-stock-transfer-status';

export class StockTransfer {
  @AutoMap() public id: string;
  @AutoMap() public organizationId: string;
  @AutoMap() public fromLocationId: string;
  @AutoMap() public toLocationId: string;
  @AutoMap() public transferNumber: string;
  @AutoMap(() => String) public status: EStockTransferStatus;
  @AutoMap(() => Date) public createdAt?: Date;
  @AutoMap(() => Date) public updatedAt?: Date;
}
