import { BadRequestException, Inject } from '@nestjs/common';
import { ICommandHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CommandHandlerStrict } from '../../../../../common';
import { EStockTransferRequestStatus } from '../../../../shared/enums/e-stock-transfer-request-status';
import { STOCK_TRANSFER_REQUEST_REPO } from '../../../../constants';
import { StockTransferRequest } from '../../domain';
import { IStockTransferRequestRepo } from '../../i-stock-transfer-request.repo';
import { CancelStockTransferRequestCommand } from './cancel-stock-transfer-request.command';

@CommandHandlerStrict(CancelStockTransferRequestCommand)
export class CancelStockTransferRequestCommandHandler implements ICommandHandler<CancelStockTransferRequestCommand, StockTransferRequest> {
  constructor(
    @Inject(STOCK_TRANSFER_REQUEST_REPO) private readonly repo: IStockTransferRequestRepo,
    @InjectPinoLogger(CancelStockTransferRequestCommandHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(command: CancelStockTransferRequestCommand): Promise<StockTransferRequest> {
    this.logger.info("Executing Command 'CancelStockTransferRequestCommand'");

    const request = await this.repo.getAsync(command.requestId);
    if (request.organizationId !== command.organizationId) {
      throw new BadRequestException(`Request ${command.requestId} not found`);
    }
    if (request.status !== EStockTransferRequestStatus.Open) {
      throw new BadRequestException(`Only OPEN requests can be cancelled. Current status: ${request.status}`);
    }

    request.status              = EStockTransferRequestStatus.Cancelled;
    request.cancelledByUserId   = command.cancelledByUserId;
    request.cancelledAt         = new Date();
    return this.repo.updateAsync(request);
  }
}
