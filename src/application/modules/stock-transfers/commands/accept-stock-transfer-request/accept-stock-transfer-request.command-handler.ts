import { BadRequestException, Inject } from '@nestjs/common';
import { ICommandHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { randomUUID } from 'crypto';
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
import { AcceptStockTransferRequestCommand } from './accept-stock-transfer-request.command';

@CommandHandlerStrict(AcceptStockTransferRequestCommand)
export class AcceptStockTransferRequestCommandHandler implements ICommandHandler<AcceptStockTransferRequestCommand, StockTransferRequest> {
  constructor(
    @Inject(STOCK_TRANSFER_REQUEST_REPO) private readonly repo: IStockTransferRequestRepo,
    @Inject(STOCK_TRANSFER_REPO) private readonly transferRepo: IStockTransferRepo,
    @Inject(INVENTORY_REPO) private readonly inventoryRepo: IInventoryRepo,
    private readonly orchestrator: StockOrchestrationService,
    @Inject(PUSH_NOTIFICATION_SERVICE) private readonly pushNotification: IPushNotificationService,
    @InjectPinoLogger(AcceptStockTransferRequestCommandHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(command: AcceptStockTransferRequestCommand): Promise<StockTransferRequest> {
    this.logger.info("Executing Command 'AcceptStockTransferRequestCommand'");

    const request = await this.repo.getAsync(command.requestId);
    if (request.organizationId !== command.organizationId) {
      throw new BadRequestException(`Request ${command.requestId} not found`);
    }
    if (request.status !== EStockTransferRequestStatus.Open) {
      throw new BadRequestException(`Request ${command.requestId} is not OPEN`);
    }
    if (request.requestingLocationId === command.acceptingLocationId) {
      throw new BadRequestException('A store cannot accept its own request');
    }

    const inventory = await this.inventoryRepo.findByOrgLocationProductAsync(
      command.organizationId,
      command.acceptingLocationId,
      request.productId,
    );
    if (!inventory) throw new BadRequestException('No inventory record found for this product at your location');

    const available = Number(inventory.quantityOnHand) - Number(inventory.quantityReserved);
    if (available < Number(request.quantityRequested)) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${available}, Requested: ${request.quantityRequested}`,
      );
    }

    await this.orchestrator.removeStock({
      inventoryId:   inventory.id,
      organizationId: command.organizationId,
      productId:     request.productId,
      locationId:    command.acceptingLocationId,
      quantity:      Number(request.quantityRequested),
      performedById: command.acceptingUserId,
      referenceId:   request.id,
    });

    const transfer          = { organizationId: command.organizationId, fromLocationId: command.acceptingLocationId, toLocationId: request.requestingLocationId, transferNumber: `STR-${randomUUID()}`, status: EStockTransferStatus.Pending };
    const savedTransfer     = await this.transferRepo.createAsync(transfer as never);

    request.status                = EStockTransferRequestStatus.Accepted;
    request.acceptedByLocationId  = command.acceptingLocationId;
    request.acceptedByUserId      = command.acceptingUserId;
    request.acceptedAt            = new Date();
    request.fulfillmentTransferId = savedTransfer.id;
    const updated = await this.repo.updateAsync(request);

    await this.notifyRequestingStoreAsync(command, request);

    return updated;
  }

  private async notifyRequestingStoreAsync(command: AcceptStockTransferRequestCommand, request: StockTransferRequest): Promise<void> {
    try {
      const userIds = await this.repo.findUsersForLocationAsync(command.organizationId, request.requestingLocationId);
      await this.pushNotification.sendBatchAsync(
        userIds.map((userId) => ({
          userId,
          organizationId: command.organizationId,
          type:           'STOCK_REQUEST_ACCEPTED',
          title:          'Stock Request Accepted',
          body:           `Your stock request has been accepted. Stock is on the way.`,
        })),
      );
    } catch (err) {
      const error = err as Error;
      this.logger.warn({ error: error.message }, 'Failed to send accept notification');
    }
  }
}
