export * from './get-stock-transfer';
export * from './get-stock-transfer-request';
export * from './list-my-stock-transfer-requests';
export * from './list-open-stock-transfer-requests';
export * from './list-stock-transfers';
export * from './search-stock-transfers';

import { GetStockTransferQueryHandler } from './get-stock-transfer';
import { GetStockTransferRequestQueryHandler } from './get-stock-transfer-request';
import { ListMyStockTransferRequestsQueryHandler } from './list-my-stock-transfer-requests';
import { ListOpenStockTransferRequestsQueryHandler } from './list-open-stock-transfer-requests';
import { SearchStockTransfersQueryHandler } from './search-stock-transfers';

export const StockTransferQueryHandlers = [
  GetStockTransferQueryHandler,
  GetStockTransferRequestQueryHandler,
  ListMyStockTransferRequestsQueryHandler,
  ListOpenStockTransferRequestsQueryHandler,
  SearchStockTransfersQueryHandler,
];
