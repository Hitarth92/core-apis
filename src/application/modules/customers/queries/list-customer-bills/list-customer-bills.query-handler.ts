import { Inject } from '@nestjs/common';
import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { QueryHandlerStrict, IPageable } from '../../../../../common';
import { BILL_REPO } from '../../../../constants';
import { Bill, BillFilter } from '../../../bills/domain';
import { IBillRepo } from '../../../bills/i-bill.repo';
import { ESaleType } from '../../../../../infrastructure/persistence/entities';
import { ListCustomerBillsQuery } from './list-customer-bills.query';

@QueryHandlerStrict(ListCustomerBillsQuery)
export class ListCustomerBillsQueryHandler implements IQueryHandler<ListCustomerBillsQuery, IPageable<Bill>> {
  constructor(
    @Inject(BILL_REPO) private readonly repo: IBillRepo,
    @InjectPinoLogger(ListCustomerBillsQueryHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: ListCustomerBillsQuery): Promise<IPageable<Bill>> {
    this.logger.info(`Executing ${ListCustomerBillsQuery.name} customerId=${query.customerId}`);
    const filter: any = {
      customerId: query.customerId,
      organizationId: query.organizationId,
      $orderBy: 'createdAt',
      $order: 'DESC',
      $page: query.$page ?? 1,
      $perPage: query.$perPage ?? 10,
    };
    if (query.excludeBlack) {
      filter.saleTypeNot = ESaleType.Black;
    }
    return this.repo.pagedAsync(filter);
  }
}
