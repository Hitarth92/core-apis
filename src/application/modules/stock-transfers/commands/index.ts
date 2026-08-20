export * from './create-stock-transfer';
export * from './complete-stock-transfer';
export * from './cancel-stock-transfer';
export * from './raise-stock-transfer-request';
export * from './accept-stock-transfer-request';
export * from './claim-stock-transfer-request';
export * from './cancel-stock-transfer-request';

import { CreateStockTransferCommandHandler } from './create-stock-transfer';
import { CompleteStockTransferCommandHandler } from './complete-stock-transfer';
import { CancelStockTransferCommandHandler } from './cancel-stock-transfer';
import { RaiseStockTransferRequestCommandHandler } from './raise-stock-transfer-request';
import { AcceptStockTransferRequestCommandHandler } from './accept-stock-transfer-request';
import { ClaimStockTransferRequestCommandHandler } from './claim-stock-transfer-request';
import { CancelStockTransferRequestCommandHandler } from './cancel-stock-transfer-request';

export const StockTransferCommandHandlers = [
  CreateStockTransferCommandHandler,
  CompleteStockTransferCommandHandler,
  CancelStockTransferCommandHandler,
  RaiseStockTransferRequestCommandHandler,
  AcceptStockTransferRequestCommandHandler,
  ClaimStockTransferRequestCommandHandler,
  CancelStockTransferRequestCommandHandler,
];
