import { IBaseRepo, Filter, PageableFilter } from '../../../common';
import { StockTransferRequest } from './domain';
import { EStockTransferRequestStatus } from '../../shared/enums/e-stock-transfer-request-status';

export const STOCK_TRANSFER_REQUEST_REPO = 'STOCK_TRANSFER_REQUEST_REPO';

export interface StockTransferRequestFilter {
  organizationId?: string;
  requestingLocationId?: string;
  status?: EStockTransferRequestStatus;
}

export interface IStockTransferRequestRepo
  extends IBaseRepo<StockTransferRequest, string, PageableFilter<StockTransferRequestFilter>, Filter<StockTransferRequestFilter>> {
  findAllOpenForOrgAsync(organizationId: string, excludeLocationId: string): Promise<StockTransferRequest[]>;
  findAllForLocationAsync(organizationId: string, locationId: string): Promise<StockTransferRequest[]>;
  findUsersForLocationAsync(organizationId: string, locationId: string): Promise<string[]>;
  findAllUserIdsInOrgAsync(organizationId: string): Promise<string[]>;
}
