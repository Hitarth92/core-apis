import { Inject } from '@nestjs/common';
import type { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { QueryHandlerStrict, IFilterNormalizer } from '../../../../../common';
import { ITEM_RETURN_REPO } from '../../../../constants';
import { ItemReturn, ItemReturnFilter } from '../../domain';
import { IItemReturnRepo } from '../..';
import { ItemReturnFilterNormalizer } from '../../helpers';
import { ListItemReturnsQuery } from './list-item-returns.query';

@QueryHandlerStrict(ListItemReturnsQuery)
export class ListItemReturnsQueryHandler implements IQueryHandler<ListItemReturnsQuery, ItemReturn[]> {
  constructor(
    @Inject(ITEM_RETURN_REPO) protected readonly repo: IItemReturnRepo,
    @Inject(ItemReturnFilterNormalizer) protected readonly filterNormalizer: IFilterNormalizer<ItemReturnFilter>,
    @InjectPinoLogger(ListItemReturnsQueryHandler.name) protected readonly logger: PinoLogger,
  ) {}

  public async execute(query: ListItemReturnsQuery): Promise<ItemReturn[]> {
    this.logger.info(`Executing Query "${ListItemReturnsQuery.name}"`);
    const filter = this.filterNormalizer.normalize(query);
    return this.repo.allAsync(filter);
  }
}
