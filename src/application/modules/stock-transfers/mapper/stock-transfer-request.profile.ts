import { createMap, Mapper } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { StockTransferRequestEntity } from '../../../../infrastructure/persistence/entities/stock-transfer-request.entity';
import { StockTransferRequest } from '../domain';
import { RaiseStockTransferRequestRequest, AcceptStockTransferRequestRequest, StockTransferRequestResponse } from '../models';
import { RaiseStockTransferRequestCommand, AcceptStockTransferRequestCommand } from '../commands';

@Injectable()
export class StockTransferRequestProfile extends AutomapperProfile {
  constructor(@InjectMapper() mapper: Mapper) { super(mapper); }

  public get profile() {
    return (mapper: Mapper) => {
      createMap(mapper, StockTransferRequestEntity, StockTransferRequest);
      createMap(mapper, StockTransferRequest, StockTransferRequestEntity);
      createMap(mapper, StockTransferRequest, StockTransferRequestResponse);
      createMap(mapper, RaiseStockTransferRequestRequest, RaiseStockTransferRequestCommand);
      createMap(mapper, AcceptStockTransferRequestRequest, AcceptStockTransferRequestCommand);
    };
  }
}
