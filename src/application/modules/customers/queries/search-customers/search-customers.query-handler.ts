import { Inject } from '@nestjs/common';
import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { QueryHandlerStrict, IPageable } from '../../../../../common';
import { CUSTOMER_REPO } from '../../../../constants';
import { Customer } from '../../domain';
import { ICustomerRepo } from '../../i-customer.repo';
import { SearchCustomersQuery } from './search-customers.query';

@QueryHandlerStrict(SearchCustomersQuery)
export class SearchCustomersQueryHandler implements IQueryHandler<SearchCustomersQuery, IPageable<Customer>> {
  constructor(
    @Inject(CUSTOMER_REPO) private readonly repo: ICustomerRepo,
    @InjectPinoLogger(SearchCustomersQueryHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: SearchCustomersQuery): Promise<IPageable<Customer>> {
    this.logger.info(`Executing ${SearchCustomersQuery.name}`);
    query.$page    = query.$page    ?? 1;
    query.$perPage = query.$perPage ?? 20;
    query.$orderBy = query.$orderBy ?? 'createdAt';
    return this.repo.pagedAsync(query);
  }
}
