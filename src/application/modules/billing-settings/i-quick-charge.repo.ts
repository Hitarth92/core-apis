import { IBaseRepo, Filter, PageableFilter } from '../../../common';
import { QuickCharge } from './domain';

export class QuickChargeFilter {
  public organizationId?: string;
  public enabled?: boolean;
}

export type IQuickChargeRepo = IBaseRepo<QuickCharge, string, PageableFilter<QuickChargeFilter>, Filter<QuickChargeFilter>>;
