import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { BaseRepo, Filter, PageableFilter } from '../../../common';
import { DriverEntity } from '../entities';
import { Driver } from '../../../application/modules/drivers/domain';
import { IDriverRepo } from '../../../application/modules/drivers/repositories/i-driver.repo';

@Injectable()
export class DriverRepo extends BaseRepo<DriverEntity, Driver, string, PageableFilter<Driver>, Filter<Driver>> implements IDriverRepo {
  public constructor(
    @InjectRepository(DriverEntity) internalRepo: Repository<DriverEntity>,
    @InjectMapper() mapper: Mapper,
    @InjectPinoLogger(DriverRepo.name) logger: PinoLogger,
  ) {
    super(internalRepo, mapper, logger, DriverEntity, Driver);
  }

  public override get idColumnName(): keyof DriverEntity {
    return 'id';
  }
}
