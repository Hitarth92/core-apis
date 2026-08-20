import { BadRequestException, Inject } from '@nestjs/common';
import { ICommandHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CommandHandlerStrict } from '../../../../../common';
import { PUSH_NOTIFICATION_SERVICE, IPushNotificationService } from '../../../../../common/push-notification';
import { EStockTransferRequestStatus } from '../../../../shared/enums/e-stock-transfer-request-status';
import { EStockTransferStatus } from '../../../../shared/enums/e-stock-transfer-status';
import { StockOrchestrationService } from '../../../../shared/services/stock-orchestration.service';
import { STOCK_TRANSFER_REQUEST_REPO, STOCK_TRANSFER_REPO, INVENTORY_REPO } from '../../../../constants';
import { StockTransferRequest } from '../../domain';
import { IStockTransferRequestRepo } from '../../i-stock-transfer-request.repo';
import { IStockTransferRepo } from '../../i-stock-transfer.repo';
import { IInventoryRepo } from '../../../inventory';
import { ClaimStockTransferRequestCommand } from './claim-stock-transfer-request.command';

@CommandHandlerStrict(ClaimStockTransferRequestCommand)
export class ClaimStockTransferRequestCommandHandler implements ICommandHandler<ClaimStockTransferRequestCommand, StockTransferRequest> {
  constructor(
    @Inject(STOCK_TRANSFER_REQUEST_REPO) private readonly repo: IStockTransferRequestRepo,
    @Inject(STOCK_TRANSFER_REPO) private readonly transferRepo: IStockTransferRepo,
    @Inject(INVENTORY_REPO) private readonly inventoryRepo: IInventoryRepo,
    private readonly orchestrator: StockOrchestrationService,
    @Inject(PUSH_NOTIFICATION_SERVICE) private readonly pushNotification: IPushNotificationService,
    @InjectPinoLogger(ClaimStockTransferRequestCommandHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(command: ClaimStockTransferRequestCommand): Promise<StockTransferRequest> {
    this.logger.info("Executing Command 'ClaimStockTransferRequestCommand'");

    const request = await this.repo.getAsync(command.requestId);
    if (request.organizationId !== command.organizationId) {
      throw new BadRequestException(`Request ${command.requestId} not found`);
    }
    if (request.status !== EStockTransferRequestStatus.Accepted) {
      throw new BadRequestException(`Request ${command.requestId} is not in ACCEPTED state`);
    }

    const inventory = await this.inventoryRepo.findByOrgLocationProductAsync(
      command.organizationId,
      request.requestingLocationId,
      request.productId,
    );
    if (!inventory) throw new BadRequestException('No inventory record found for this product at the requesting location');

    await this.orchestrator.addStock({
      inventoryId:    inventory.id,
      organizationId: command.organizationId,
      productId:      request.productId,
      locationId:     request.requestingLocationId,
      quantity:       Number(request.quantityRequested),
      performedById:  command.claimingUserId,
      referenceId:    request.id,
    });

    if (request.fulfillmentTransferId) {
      const transfer = await this.transferRepo.getAsync(request.fulfillmentTransferId);
      transfer.status = EStockTransferStatus.Completed;
      await this.transferRepo.updateAsync(transfer);
    }

    const now             = new Date();
    request.status        = EStockTransferRequestStatus.Completed;
    request.claimedAt     = now;
    const updated = await this.repo.updateAsync(request);

    await this.notifyAcceptingStoreAsync(command, request);

    return updated;
  }

  private async notifyAcceptingStoreAsync(command: ClaimStockTransferRequestCommand, request: StockTransferRequest): Promise<void> {
    if (!request.acceptedByLocationId) return;
    try {
      const userIds = await this.repo.findUsersForLocationAsync(command.organizationId, request.acceptedByLocationId);
      await this.pushNotification.sendBatchAsync(
        userIds.map((userId) => ({
          userId,
          organizationId: command.organizationId,
          type:           'STOCK_REQUEST_CLAIMED',
          title:          'Stock Received',
          body:           `The requesting store has confirmed receipt of the stock. Request is now complete.`,
        })),
      );
    } catch (err) {
      const error = err as Error;
      this.logger.warn({ error: error.message }, 'Failed to send claim notification');
    }
  }
}
