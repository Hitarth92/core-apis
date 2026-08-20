import { Inject } from '@nestjs/common';
import { ICommandHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CommandHandlerStrict } from '../../../../../common';
import { PUSH_NOTIFICATION_SERVICE, IPushNotificationService } from '../../../../../common/push-notification';
import { EStockTransferRequestStatus } from '../../../../shared/enums/e-stock-transfer-request-status';
import { STOCK_TRANSFER_REQUEST_REPO } from '../../../../constants';
import { StockTransferRequest } from '../../domain';
import { IStockTransferRequestRepo } from '../../i-stock-transfer-request.repo';
import { RaiseStockTransferRequestCommand } from './raise-stock-transfer-request.command';

@CommandHandlerStrict(RaiseStockTransferRequestCommand)
export class RaiseStockTransferRequestCommandHandler implements ICommandHandler<RaiseStockTransferRequestCommand, StockTransferRequest> {
  constructor(
    @Inject(STOCK_TRANSFER_REQUEST_REPO) private readonly repo: IStockTransferRequestRepo,
    @Inject(PUSH_NOTIFICATION_SERVICE) private readonly pushNotification: IPushNotificationService,
    @InjectPinoLogger(RaiseStockTransferRequestCommandHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(command: RaiseStockTransferRequestCommand): Promise<StockTransferRequest> {
    this.logger.info("Executing Command 'RaiseStockTransferRequestCommand'");

    const request                  = new StockTransferRequest();
    request.organizationId         = command.organizationId;
    request.requestingLocationId   = command.requestingLocationId;
    request.requestingUserId       = command.requestingUserId;
    request.productId              = command.productId;
    request.variantId              = command.variantId;
    request.quantityRequested      = command.quantityRequested;
    request.status                 = EStockTransferRequestStatus.Open;

    const saved = await this.repo.createAsync(request);

    await this.notifyOrgAsync(command);

    return saved;
  }

  private async notifyOrgAsync(command: RaiseStockTransferRequestCommand): Promise<void> {
    try {
      const allUserIds      = await this.repo.findAllUserIdsInOrgAsync(command.organizationId);
      const requestingUsers = await this.repo.findUsersForLocationAsync(command.organizationId, command.requestingLocationId);
      const requestingSet   = new Set(requestingUsers);
      const recipients      = allUserIds.filter((uid) => !requestingSet.has(uid));

      const notifTitle = 'Stock Request Raised';
      const notifBody  = `A store is requesting ${command.quantityRequested} unit(s) of a product. Open the Request tab to fulfill.`;

      await this.pushNotification.sendBatchAsync(
        recipients.map((userId) => ({
          userId,
          organizationId: command.organizationId,
          type:           'STOCK_REQUEST_RAISED',
          title:          notifTitle,
          body:           notifBody,
        })),
      );
    } catch (err) {
      const error = err as Error;
      this.logger.warn({ error: error.message }, 'Failed to send raise notifications — request was saved');
    }
  }
}
