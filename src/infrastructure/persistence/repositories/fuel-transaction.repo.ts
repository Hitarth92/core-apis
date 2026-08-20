import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { BaseRepo } from '../../../common';
import { Filter, PageableFilter } from '../../../common';
import { FuelTransactionEntity } from '../entities';
import { FuelTransaction } from '../../../application/modules/maintenance/domain';
import { IFuelTransactionRepo } from '../../../application/modules/maintenance/repositories/i-fuel-transaction.repo';

@Injectable()
export class FuelTransactionRepo extends BaseRepo<FuelTransactionEntity, FuelTransaction, string, PageableFilter<any>, Filter<any>> implements IFuelTransactionRepo {
  constructor(
    @InjectRepository(FuelTransactionEntity) internalRepo: Repository<FuelTransactionEntity>,
    @InjectMapper() mapper: Mapper,
    @InjectPinoLogger(FuelTransactionRepo.name) logger: PinoLogger,
  ) {
    super(internalRepo, mapper, logger, FuelTransactionEntity, FuelTransaction);
  }

  public override get idColumnName(): keyof FuelTransactionEntity {
    return 'id';
  }
}
