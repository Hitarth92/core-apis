import { Inject } from '@nestjs/common';
import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { QueryHandlerStrict } from '../../../../../common';
import { STOCK_TRANSFER_REQUEST_REPO, INVENTORY_REPO } from '../../../../constants';
import { StockTransferRequest } from '../../domain';
import { IStockTransferRequestRepo } from '../../i-stock-transfer-request.repo';
import { IInventoryRepo } from '../../../inventory';
import { ListOpenStockTransferRequestsQuery } from './list-open-stock-transfer-requests.query';

export interface StockTransferRequestWithFulfillability extends StockTransferRequest {
  canFulfill: boolean;
  availableStock: number;
}

@QueryHandlerStrict(ListOpenStockTransferRequestsQuery)
export class ListOpenStockTransferRequestsQueryHandler implements IQueryHandler<ListOpenStockTransferRequestsQuery, StockTransferRequestWithFulfillability[]> {
  constructor(
    @Inject(STOCK_TRANSFER_REQUEST_REPO) private readonly repo: IStockTransferRequestRepo,
    @Inject(INVENTORY_REPO) private readonly inventoryRepo: IInventoryRepo,
    @InjectPinoLogger(ListOpenStockTransferRequestsQueryHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: ListOpenStockTransferRequestsQuery): Promise<StockTransferRequestWithFulfillability[]> {
    this.logger.info("Executing Query 'ListOpenStockTransferRequestsQuery'");

    const requests = await this.repo.findAllOpenForOrgAsync(query.organizationId, query.viewerLocationId);

    const results = await Promise.all(
      requests.map(async (request) => {
        const inventory = await this.inventoryRepo.findByOrgLocationProductAsync(
          query.organizationId,
          query.viewerLocationId,
          request.productId,
        );
        const available   = inventory ? Number(inventory.quantityOnHand) - Number(inventory.quantityReserved) : 0;
        const canFulfill  = available >= Number(request.quantityRequested);
        return Object.assign(request, { canFulfill, availableStock: available });
      }),
    );

    return results;
  }
}
