import { Inject } from '@nestjs/common';
import type { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { QueryHandlerStrict } from '../../../../../common';
import { IFilterNormalizer, IPageable } from '../../../../../common';
import { STOCK_TRANSFER_REPO } from '../../../../constants';
import { StockTransfer } from '../../domain';
import { IStockTransferRepo, StockTransferFilter } from '../../i-stock-transfer.repo';
import { StockTransferFilterNormalizer } from '../../helpers';
import { SearchStockTransfersQuery } from './search-stock-transfers.query';

@QueryHandlerStrict(SearchStockTransfersQuery)
export class SearchStockTransfersQueryHandler implements IQueryHandler<SearchStockTransfersQuery, IPageable<StockTransfer>> {
  constructor(
    @Inject(STOCK_TRANSFER_REPO) protected readonly repo: IStockTransferRepo,
    @Inject(StockTransferFilterNormalizer) protected readonly filterNormalizer: IFilterNormalizer<StockTransferFilter>,
    @InjectPinoLogger(SearchStockTransfersQueryHandler.name) protected readonly logger: PinoLogger,
  ) {}

  public async execute(query: SearchStockTransfersQuery): Promise<IPageable<StockTransfer>> {
    this.logger.info(`Executing Query "${SearchStockTransfersQuery.name}"`);
    const filter = this.filterNormalizer.pageableNormalize(query);
    return this.repo.pagedAsync(filter);
  }
}
