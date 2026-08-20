import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { BaseRepo } from '../../../common';
import { Filter, PageableFilter } from '../../../common';
import { MaintenanceEntity } from '../entities';
import { Maintenance } from '../../../application/modules/maintenance/domain';
import { IMaintenanceRepo } from '../../../application/modules/maintenance/repositories/i-maintenance.repo';

@Injectable()
export class MaintenanceRepo extends BaseRepo<MaintenanceEntity, Maintenance, string, PageableFilter<any>, Filter<any>> implements IMaintenanceRepo {
  constructor(
    @InjectRepository(MaintenanceEntity) internalRepo: Repository<MaintenanceEntity>,
    @InjectMapper() mapper: Mapper,
    @InjectPinoLogger(MaintenanceRepo.name) logger: PinoLogger,
  ) {
    super(internalRepo, mapper, logger, MaintenanceEntity, Maintenance);
  }

  public override get idColumnName(): keyof MaintenanceEntity {
    return 'id';
  }
}
