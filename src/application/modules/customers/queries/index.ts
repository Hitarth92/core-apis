export * from './get-customer';
export * from './search-customers';
export * from './list-customer-bills';
export * from './list-customer-credit-transactions';

import { GetCustomerQueryHandler } from './get-customer';
import { SearchCustomersQueryHandler } from './search-customers';
import { ListCustomerBillsQueryHandler } from './list-customer-bills';
import { ListCustomerCreditTransactionsQueryHandler } from './list-customer-credit-transactions';

export const CustomerQueryHandlers = [
  GetCustomerQueryHandler,
  SearchCustomersQueryHandler,
  ListCustomerBillsQueryHandler,
  ListCustomerCreditTransactionsQueryHandler,
];
