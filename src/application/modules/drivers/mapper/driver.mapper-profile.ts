import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { createMap, Mapper, MappingProfile } from '@automapper/core';
import { Injectable } from '@nestjs/common';
import { CreateDriverRequest, UpdateDriverRequest, SearchDriversRequest, ListDriversRequest, DriverResponse } from '../models';
import { Driver } from '../domain';
import { CreateDriverCommand, UpdateDriverCommand } from '../commands';
import { SearchDriversQuery } from '../queries/search-drivers';
import { ListDriversQuery } from '../queries/list-drivers';
import { DriverEntity } from '../../../../infrastructure/persistence/entities';

@Injectable()
export class DriverProfile extends AutomapperProfile {
  public constructor(@InjectMapper() mapper: Mapper) {
    super(mapper);
  }

  public override get profile(): MappingProfile {
    return (mapper) => {
      createMap(mapper, DriverEntity, Driver);
      createMap(mapper, CreateDriverRequest, CreateDriverCommand);
      createMap(mapper, CreateDriverCommand, Driver);
      createMap(mapper, UpdateDriverRequest, UpdateDriverCommand);
      createMap(mapper, UpdateDriverCommand, Driver);
      createMap(mapper, SearchDriversRequest, SearchDriversQuery);
      createMap(mapper, ListDriversRequest, ListDriversQuery);
      createMap(mapper, Driver, DriverResponse);
    };
  }
}
