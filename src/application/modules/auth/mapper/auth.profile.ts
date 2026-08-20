import { createMap, Mapper } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { OrgMemberEntity } from '../../../../infrastructure/persistence/entities';
import { OnboardOrganizationRequest } from '../models';
import { OnboardOrganizationCommand } from '../commands/onboard-organization';
import { OrgMember } from '../domain';

@Injectable()
export class AuthProfile extends AutomapperProfile {
  constructor(@InjectMapper() mapper: Mapper) {
    super(mapper);
  }

  public get profile() {
    return (mapper: Mapper) => {
      createMap(mapper, OrgMemberEntity, OrgMember);
      createMap(mapper, OrgMember, OrgMemberEntity);
      createMap(mapper, OnboardOrganizationRequest, OnboardOrganizationCommand);
    };
  }
}
