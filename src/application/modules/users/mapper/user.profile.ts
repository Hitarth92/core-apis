import { createMap, Mapper } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { UserEntity } from '../../../../infrastructure/persistence/entities/user.entity';
import { User } from '../domain';
import { AssignUserToOrgRequest, CreateUserRequest, InviteUserRequest, UpdateUserRolesRequest } from '../models';
import { CreateUserCommand, InviteUserCommand, UpdateUserRolesCommand, AssignUserToOrgCommand } from '../commands';
import { UserResponse } from '../models';

@Injectable()
export class UserProfile extends AutomapperProfile {
  constructor(@InjectMapper() mapper: Mapper) { super(mapper); }

  public get profile() {
    return (mapper: Mapper) => {
      createMap(mapper, UserEntity,           User);
      createMap(mapper, User,                 UserEntity);
      createMap(mapper, CreateUserRequest,    CreateUserCommand);
      createMap(mapper, User,                 UserResponse);
      createMap(mapper, InviteUserRequest,    InviteUserCommand);
      createMap(mapper, UpdateUserRolesRequest, UpdateUserRolesCommand);
      createMap(mapper, AssignUserToOrgRequest, AssignUserToOrgCommand);
    };
  }
}
