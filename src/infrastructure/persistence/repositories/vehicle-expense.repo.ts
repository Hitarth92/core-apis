import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { BaseRepo } from '../../../common';
import { Filter, PageableFilter } from '../../../common';
import { VehicleExpenseEntity } from '../entities';
import { VehicleExpense } from '../../../application/modules/vehicle-expenses/domain';
import { IVehicleExpenseRepo } from '../../../application/modules/vehicle-expenses/repositories/i-vehicle-expense.repo';

@Injectable()
export class VehicleExpenseRepo extends BaseRepo<VehicleExpenseEntity, VehicleExpense, string, PageableFilter<any>, Filter<any>> implements IVehicleExpenseRepo {
  constructor(
    @InjectRepository(VehicleExpenseEntity) internalRepo: Repository<VehicleExpenseEntity>,
    @InjectMapper() mapper: Mapper,
    @InjectPinoLogger(VehicleExpenseRepo.name) logger: PinoLogger,
  ) {
    super(internalRepo, mapper, logger, VehicleExpenseEntity, VehicleExpense);
  }

  public override get idColumnName(): keyof VehicleExpenseEntity {
    return 'id';
  }
}
