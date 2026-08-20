import { AutoMap } from '@automapper/classes';
import { EOrder, Filter, QueryBase } from '../../../../../common';
import { StockTransferFilter } from '../../i-stock-transfer.repo';

export class ListStockTransfersQuery extends QueryBase implements Filter<StockTransferFilter> {
  @AutoMap() public organizationId?: string;
  @AutoMap() public status?: string;
  @AutoMap() public fromLocationId?: string;
  @AutoMap() public toLocationId?: string;
  @AutoMap() public search?: string;
  @AutoMap(() => Array) public accessibleLocationIds?: string[];

  @AutoMap(() => Array) public $ids?: string[];
  @AutoMap() public $orderBy?: string;
  @AutoMap(() => String) public $order?: EOrder;
}
