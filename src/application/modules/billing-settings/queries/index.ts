export * from './list-quick-charges';
export * from './list-customer-type-rules';

import { ListQuickChargesQueryHandler } from './list-quick-charges';
import { ListCustomerTypeRulesQueryHandler } from './list-customer-type-rules';

export const BillingSettingsQueryHandlers = [
  ListQuickChargesQueryHandler,
  ListCustomerTypeRulesQueryHandler,
];
