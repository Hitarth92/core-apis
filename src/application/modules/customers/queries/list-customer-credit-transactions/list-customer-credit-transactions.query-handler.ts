import { Inject } from '@nestjs/common';
import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { QueryHandlerStrict, IPageable } from '../../../../../common';
import { CUSTOMER_CREDIT_TRANSACTION_REPO } from '../../../../constants';
import { CustomerCreditTransaction } from '../../../credit-approvals/domain';
import { ICustomerCreditTransactionRepo } from '../../../credit-approvals/i-customer-credit-transaction.repo';
import { ListCustomerCreditTransactionsQuery } from './list-customer-credit-transactions.query';

@QueryHandlerStrict(ListCustomerCreditTransactionsQuery)
export class ListCustomerCreditTransactionsQueryHandler
  implements IQueryHandler<ListCustomerCreditTransactionsQuery, IPageable<CustomerCreditTransaction>>
{
  constructor(
    @Inject(CUSTOMER_CREDIT_TRANSACTION_REPO) private readonly repo: ICustomerCreditTransactionRepo,
    @InjectPinoLogger(ListCustomerCreditTransactionsQueryHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: ListCustomerCreditTransactionsQuery): Promise<IPageable<CustomerCreditTransaction>> {
    this.logger.info(`Executing ${ListCustomerCreditTransactionsQuery.name} customerId=${query.customerId}`);
    return this.repo.pagedAsync({
      customerId: query.customerId,
      $orderBy: 'createdAt',
      $order: 'DESC',
      $page: query.$page ?? 1,
      $perPage: query.$perPage ?? 20,
    } as any);
  }
}
