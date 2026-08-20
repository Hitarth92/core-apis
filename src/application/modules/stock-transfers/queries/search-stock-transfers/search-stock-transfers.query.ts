import { AutoMap } from '@automapper/classes';
import { PageableFilter } from '../../../../../common';
import { StockTransferFilter } from '../../i-stock-transfer.repo';
import { ListStockTransfersQuery } from '../list-stock-transfers/list-stock-transfers.query';

export class SearchStockTransfersQuery extends ListStockTransfersQuery implements PageableFilter<StockTransferFilter> {
  @AutoMap() public $page?: number;
  @AutoMap() public $perPage?: number;
}
