import { IBaseRepo } from '../../../common';
import { Filter, PageableFilter } from '../../../common';
import { Supplier } from './domain';

export interface SupplierFilter {
  name?: string;
  isActive?: boolean;
  organizationId?: string;
}

export const SUPPLIER_REPO = 'SUPPLIER_REPO';

export type ISupplierRepo = IBaseRepo<Supplier, string, PageableFilter<SupplierFilter>, Filter<SupplierFilter>>;
