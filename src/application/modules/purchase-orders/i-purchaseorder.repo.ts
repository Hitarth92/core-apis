import { IBaseRepo } from '../../../common';
import { Filter, PageableFilter } from '../../../common';
import { PurchaseOrder } from './domain';
import { EPurchaseOrderStatus } from 'src/application/shared/enums';

export interface PurchaseOrderFilter {
  organizationId?: string;
  locationId?: string;
  supplierId?: string;
  status?: EPurchaseOrderStatus;
}

export const PURCHASE_ORDER_REPO = 'PURCHASE_ORDER_REPO';

export type IPurchaseOrderRepo = IBaseRepo<PurchaseOrder, string, PageableFilter<PurchaseOrderFilter>, Filter<PurchaseOrderFilter>>;
