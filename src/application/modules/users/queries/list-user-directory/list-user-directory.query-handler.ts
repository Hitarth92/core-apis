import { Inject } from '@nestjs/common';
import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectMapper } from '@automapper/nestjs';
import { Mapper } from '@automapper/core';
import { QueryHandlerStrict } from '../../../../../common';
import { USER_REPO } from '../../../../constants';
import { User } from '../../domain';
import { IUserRepo } from '../..';
import { UserResponse } from '../../models';
import { ErpRoleLookupService } from '../../services';
import { ListUserDirectoryQuery } from './list-user-directory.query';

@QueryHandlerStrict(ListUserDirectoryQuery)
export class ListUserDirectoryQueryHandler implements IQueryHandler<ListUserDirectoryQuery, UserResponse[]> {
  public constructor(
    @Inject(USER_REPO) private readonly repo: IUserRepo,
    @InjectMapper() private readonly mapper: Mapper,
    private readonly erpRoles: ErpRoleLookupService,
    @InjectPinoLogger(ListUserDirectoryQueryHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: ListUserDirectoryQuery): Promise<UserResponse[]> {
    this.logger.info(`Executing ${ListUserDirectoryQuery.name} org=${query.organizationId}`);
    const users = await this.repo.allByOrganizationAsync(query.organizationId);
    const responses = this.mapper.mapArray(users, User, UserResponse);
    const rolesByUserId = await this.erpRoles.rolesByUserIds(users.map((u) => u.id));
    return responses.map((row) => {
      const roleNames = rolesByUserId.get(row.id);
      return roleNames?.length ? Object.assign(new UserResponse(), row, { roleNames }) : row;
    });
  }
}
