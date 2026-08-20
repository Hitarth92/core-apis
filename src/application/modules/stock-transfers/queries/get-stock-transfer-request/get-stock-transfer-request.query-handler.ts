import { Inject } from '@nestjs/common';
import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { QueryHandlerStrict } from '../../../../../common';
import { STOCK_TRANSFER_REQUEST_REPO } from '../../../../constants';
import { StockTransferRequest } from '../../domain';
import { IStockTransferRequestRepo } from '../../i-stock-transfer-request.repo';
import { GetStockTransferRequestQuery } from './get-stock-transfer-request.query';

@QueryHandlerStrict(GetStockTransferRequestQuery)
export class GetStockTransferRequestQueryHandler implements IQueryHandler<GetStockTransferRequestQuery, StockTransferRequest> {
  constructor(
    @Inject(STOCK_TRANSFER_REQUEST_REPO) private readonly repo: IStockTransferRequestRepo,
    @InjectPinoLogger(GetStockTransferRequestQueryHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: GetStockTransferRequestQuery): Promise<StockTransferRequest> {
    this.logger.info("Executing Query 'GetStockTransferRequestQuery'");
    return this.repo.getAsync(query.id);
  }
}
