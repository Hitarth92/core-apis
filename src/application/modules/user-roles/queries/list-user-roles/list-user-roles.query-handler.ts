import { Inject } from '@nestjs/common';
import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { QueryHandlerStrict } from '../../../../../common';
import { USER_ROLE_REPO } from '../../../../constants';
import { UserRole } from '../../domain';
import { IUserRoleRepo } from '../..';
import { UserRoleResponse } from '../../models';
import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { ListUserRolesQuery } from './list-user-roles.query';

@QueryHandlerStrict(ListUserRolesQuery)
export class ListUserRolesQueryHandler implements IQueryHandler<ListUserRolesQuery, UserRoleResponse[]> {
  public constructor(
    @Inject(USER_ROLE_REPO) private readonly repo: IUserRoleRepo,
    @InjectMapper() private readonly mapper: Mapper,
    @InjectPinoLogger(ListUserRolesQueryHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: ListUserRolesQuery): Promise<UserRoleResponse[]> {
    this.logger.info(`Executing ${ListUserRolesQuery.name}`);
    const items = query.organizationId
      ? await this.repo.allByOrganizationAsync(query.organizationId)
      : await this.repo.allAsync();
    return this.mapper.mapArray(items, UserRole, UserRoleResponse);
  }
}
