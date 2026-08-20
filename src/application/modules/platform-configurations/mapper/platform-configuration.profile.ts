import { createMap, Mapper } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { PlatformConfigurationEntity } from '../../../../infrastructure/persistence/entities/platform-configuration.entity';
import { PlatformConfiguration } from '../domain';
import { CreatePlatformConfigurationRequest, PlatformConfigurationResponse } from '../models';
import { CreatePlatformConfigurationCommand } from '../commands';

@Injectable()
export class PlatformConfigurationProfile extends AutomapperProfile {
  constructor(@InjectMapper() mapper: Mapper) { super(mapper); }

  public get profile() {
    return (mapper: Mapper) => {
      createMap(mapper, PlatformConfigurationEntity, PlatformConfiguration);
      createMap(mapper, PlatformConfiguration, PlatformConfigurationEntity);
      createMap(mapper, CreatePlatformConfigurationRequest, CreatePlatformConfigurationCommand);
      createMap(mapper, PlatformConfiguration, PlatformConfigurationResponse);
    };
  }
}
