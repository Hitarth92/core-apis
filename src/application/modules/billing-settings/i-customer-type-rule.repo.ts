import { IBaseRepo, Filter, PageableFilter } from '../../../common';
import { ECustomerType } from '../../../infrastructure/persistence/entities';
import { CustomerTypeRule } from './domain';

export class CustomerTypeRuleFilter {
  public organizationId?: string;
  public customerType?: ECustomerType;
}

export type ICustomerTypeRuleRepo = IBaseRepo<
  CustomerTypeRule,
  string,
  PageableFilter<CustomerTypeRuleFilter>,
  Filter<CustomerTypeRuleFilter>
>;
