export * from './create-quick-charge';
export * from './update-quick-charge';
export * from './delete-quick-charge';
export * from './update-customer-type-rule';

import { CreateQuickChargeCommandHandler } from './create-quick-charge';
import { UpdateQuickChargeCommandHandler } from './update-quick-charge';
import { DeleteQuickChargeCommandHandler } from './delete-quick-charge';
import { UpdateCustomerTypeRuleCommandHandler } from './update-customer-type-rule';

export const BillingSettingsCommandHandlers = [
  CreateQuickChargeCommandHandler,
  UpdateQuickChargeCommandHandler,
  DeleteQuickChargeCommandHandler,
  UpdateCustomerTypeRuleCommandHandler,
];
