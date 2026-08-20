import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { BaseRepo } from '../../../common';
import { Filter, PageableFilter } from '../../../common';
import { VehicleEntity } from '../entities';
import { Vehicle } from '../../../application/modules/vehicles/domain';
import { IVehicleRepo } from '../../../application/modules/vehicles/repositories/i-vehicle.repo';

@Injectable()
export class VehicleRepo extends BaseRepo<VehicleEntity, Vehicle, string, PageableFilter<any>, Filter<any>> implements IVehicleRepo {
  constructor(
    @InjectRepository(VehicleEntity) internalRepo: Repository<VehicleEntity>,
    @InjectMapper() mapper: Mapper,
    @InjectPinoLogger(VehicleRepo.name) logger: PinoLogger,
  ) {
    super(internalRepo, mapper, logger, VehicleEntity, Vehicle);
  }

  public override get idColumnName(): keyof VehicleEntity {
    return 'id';
  }
}
