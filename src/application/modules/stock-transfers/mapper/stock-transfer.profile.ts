import { createMap, forMember, mapFrom, Mapper } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { StockTransferEntity } from '../../../../infrastructure/persistence/entities/stock-transfer.entity';
import { TransferStockOperationInput } from 'src/application/shared';
import { StockTransfer } from '../domain';
import { CreateStockTransferRequest, StockTransferResponse, CompleteStockTransferRequest, CompleteTransferItemRequest, SearchStockTransfersRequest, ListStockTransfersRequest } from '../models';
import { CreateStockTransferCommand, CompleteStockTransferCommand, CompleteTransferItemInput } from '../commands';
import { SearchStockTransfersQuery, ListStockTransfersQuery } from '../queries';

@Injectable()
export class StockTransferProfile extends AutomapperProfile {
  constructor(@InjectMapper() mapper: Mapper) { super(mapper); }

  public get profile() {
    return (mapper: Mapper) => {
      createMap(mapper, StockTransferEntity, StockTransfer);
      createMap(mapper, StockTransfer, StockTransferEntity);
      createMap(mapper, CreateStockTransferRequest, CreateStockTransferCommand);
      createMap(mapper, CreateStockTransferCommand, StockTransfer);
      createMap(mapper, StockTransfer, StockTransferResponse);
      createMap(mapper, SearchStockTransfersRequest, SearchStockTransfersQuery);
      createMap(mapper, ListStockTransfersRequest, ListStockTransfersQuery);
      createMap(mapper, CompleteTransferItemRequest, CompleteTransferItemInput);
      createMap(mapper, CompleteTransferItemInput, TransferStockOperationInput);
      createMap(
        mapper,
        CompleteStockTransferRequest,
        CompleteStockTransferCommand,
        forMember(
          (dest) => dest.items,
          mapFrom((src) => mapper.mapArray(src.items, CompleteTransferItemRequest, CompleteTransferItemInput)),
        ),
      );
    };
  }
}
