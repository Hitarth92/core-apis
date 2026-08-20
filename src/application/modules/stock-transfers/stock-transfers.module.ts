import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { SharedModule } from 'src/application/shared';
import { StockTransfersController } from './stock-transfers.controller';
import { StockTransferRequestsController } from './stock-transfer-requests.controller';
import { StockTransferCommandHandlers } from './commands';
import { StockTransferQueryHandlers } from './queries';
import { StockTransferProfile } from './mapper/stock-transfer.profile';
import { StockTransferRequestProfile } from './mapper/stock-transfer-request.profile';
import { StockTransferFeatureOptions } from './options/stock-transfer-feature.options';
import { StockTransferFilterNormalizer } from './helpers/stock-transfer-filter.normalizer';

@Module({
  imports:     [CqrsModule, SharedModule],
  controllers: [StockTransfersController, StockTransferRequestsController],
  providers:   [
    ...StockTransferCommandHandlers,
    ...StockTransferQueryHandlers,
    StockTransferProfile,
    StockTransferRequestProfile,
    StockTransferFeatureOptions,
    StockTransferFilterNormalizer,
  ],
})
export class StockTransfersModule {}
