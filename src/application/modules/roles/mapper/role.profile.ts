import { createMap, Mapper } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { RoleEntity } from '../../../../infrastructure/persistence/entities/role.entity';
import { Role } from '../domain';
import { CreateRoleRequest, RoleResponse } from '../models';
import { CreateRoleCommand } from '../commands';

@Injectable()
export class RoleProfile extends AutomapperProfile {
  constructor(@InjectMapper() mapper: Mapper) { super(mapper); }

  public get profile() {
    return (mapper: Mapper) => {
      createMap(mapper, RoleEntity, Role);
      createMap(mapper, Role, RoleEntity);
      createMap(mapper, CreateRoleRequest, CreateRoleCommand);
      createMap(mapper, Role, RoleResponse);
    };
  }
}
