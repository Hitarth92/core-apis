import { createMap, Mapper } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { UserRoleEntity } from '../../../../infrastructure/persistence/entities/user-role.entity';
import { UserRole } from '../domain';
import { CreateUserRoleRequest, UpdateUserRoleRequest, UserRoleResponse } from '../models';
import { CreateUserRoleCommand, UpdateUserRoleCommand } from '../commands';

@Injectable()
export class UserRoleProfile extends AutomapperProfile {
  constructor(@InjectMapper() mapper: Mapper) { super(mapper); }

  public get profile() {
    return (mapper: Mapper) => {
      createMap(mapper, UserRoleEntity, UserRole);
      createMap(mapper, UserRole, UserRoleEntity);
      createMap(mapper, CreateUserRoleRequest, CreateUserRoleCommand);
      createMap(mapper, UpdateUserRoleRequest, UpdateUserRoleCommand);
      createMap(mapper, UserRole, UserRoleResponse);
    };
  }
}
