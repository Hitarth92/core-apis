export * from './create-customer';
export * from './update-customer';
export * from './delete-customer';
export * from './create-credit-transaction';

import { CreateCustomerCommandHandler } from './create-customer';
import { UpdateCustomerCommandHandler } from './update-customer';
import { DeleteCustomerCommandHandler } from './delete-customer';
import { CreateCreditTransactionCommandHandler } from './create-credit-transaction';

export const CustomerCommandHandlers = [
  CreateCustomerCommandHandler,
  UpdateCustomerCommandHandler,
  DeleteCustomerCommandHandler,
  CreateCreditTransactionCommandHandler,
];
