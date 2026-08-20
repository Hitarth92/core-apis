import { createMap, Mapper } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { OrderEntity } from '../../../../infrastructure/persistence/entities/order.entity';
import { Order } from '../domain';
import { CreateOrderRequest, OrderResponse } from '../models';
import { CreateOrderCommand } from '../commands';

@Injectable()
export class OrderProfile extends AutomapperProfile {
  constructor(@InjectMapper() mapper: Mapper) { super(mapper); }

  public get profile() {
    return (mapper: Mapper) => {
      createMap(mapper, OrderEntity, Order);
      createMap(mapper, Order, OrderEntity);
      createMap(mapper, CreateOrderRequest, CreateOrderCommand);
      createMap(mapper, Order, OrderResponse);
    };
  }
}
