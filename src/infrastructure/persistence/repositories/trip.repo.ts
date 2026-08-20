import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { BaseRepo, Filter, PageableFilter } from '../../../common';
import { TripEntity } from '../entities';
import { Trip } from '../../../application/modules/trips/domain';
import { ITripRepo } from '../../../application/modules/trips/repositories/i-trip.repo';

@Injectable()
export class TripRepo extends BaseRepo<TripEntity, Trip, string, PageableFilter<Trip>, Filter<Trip>> implements ITripRepo {
  public constructor(
    @InjectRepository(TripEntity) internalRepo: Repository<TripEntity>,
    @InjectMapper() mapper: Mapper,
    @InjectPinoLogger(TripRepo.name) logger: PinoLogger,
  ) {
    super(internalRepo, mapper, logger, TripEntity, Trip);
  }

  public override get idColumnName(): keyof TripEntity {
    return 'id';
  }
}
