import { Inject } from '@nestjs/common';
import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { QueryHandlerStrict } from '../../../../../common';
import { STOCK_TRANSFER_REQUEST_REPO } from '../../../../constants';
import { StockTransferRequest } from '../../domain';
import { IStockTransferRequestRepo } from '../../i-stock-transfer-request.repo';
import { ListMyStockTransferRequestsQuery } from './list-my-stock-transfer-requests.query';

@QueryHandlerStrict(ListMyStockTransferRequestsQuery)
export class ListMyStockTransferRequestsQueryHandler implements IQueryHandler<ListMyStockTransferRequestsQuery, StockTransferRequest[]> {
  constructor(
    @Inject(STOCK_TRANSFER_REQUEST_REPO) private readonly repo: IStockTransferRequestRepo,
    @InjectPinoLogger(ListMyStockTransferRequestsQueryHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: ListMyStockTransferRequestsQuery): Promise<StockTransferRequest[]> {
    this.logger.info("Executing Query 'ListMyStockTransferRequestsQuery'");
    return this.repo.findAllForLocationAsync(query.organizationId, query.locationId);
  }
}
