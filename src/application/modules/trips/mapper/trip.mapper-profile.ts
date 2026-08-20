import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { createMap, Mapper, MappingProfile } from '@automapper/core';
import { Injectable } from '@nestjs/common';
import { CreateTripRequest, UpdateTripRequest, SearchTripsRequest, ListTripsRequest, CreateTripResponse } from '../models';
import { Trip } from '../domain';
import { CreateTripCommand, UpdateTripCommand } from '../commands';
import { SearchTripsQuery } from '../queries/search-trips';
import { ListTripsQuery } from '../queries/list-trips';
import { TripEntity } from '../../../../infrastructure/persistence/entities';

@Injectable()
export class TripProfile extends AutomapperProfile {
  public constructor(@InjectMapper() mapper: Mapper) {
    super(mapper);
  }

  public override get profile(): MappingProfile {
    return (mapper) => {
      createMap(mapper, TripEntity, Trip);
      createMap(mapper, CreateTripRequest, CreateTripCommand);
      createMap(mapper, CreateTripCommand, Trip);
      createMap(mapper, UpdateTripRequest, UpdateTripCommand);
      createMap(mapper, UpdateTripCommand, Trip);
      createMap(mapper, SearchTripsRequest, SearchTripsQuery);
      createMap(mapper, ListTripsRequest, ListTripsQuery);
      createMap(mapper, Trip, CreateTripResponse);
    };
  }
}
