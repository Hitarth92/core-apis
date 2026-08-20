import { IBaseRepo, Filter, PageableFilter } from '../../../common';
import { StockTransfer } from './domain';

export interface StockTransferFilter {
  organizationId?: string;
  status?: string;
  fromLocationId?: string;
  toLocationId?: string;
  search?: string;
  /** Set by controller for store-scoped users — not exposed via API */
  accessibleLocationIds?: string[];
}

export type IStockTransferRepo = IBaseRepo<StockTransfer, string, PageableFilter<StockTransferFilter>, Filter<StockTransferFilter>>;
