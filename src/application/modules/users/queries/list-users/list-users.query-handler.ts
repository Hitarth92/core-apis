import { Inject } from '@nestjs/common';
import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { QueryHandlerStrict, CLERK_SERVICE, IClerkService } from '../../../../../common';
import { ClerkUserListResponse, ClerkUserResponse } from '../../models';
import { ErpRoleLookupService } from '../../services';
import { enrichClerkUsersWithErpRoles } from '../enrich-clerk-users-erp-roles';
import { ListUsersQuery } from './list-users.query';

@QueryHandlerStrict(ListUsersQuery)
export class ListUsersQueryHandler implements IQueryHandler<ListUsersQuery, ClerkUserListResponse> {
  constructor(
    @Inject(CLERK_SERVICE) private readonly clerkService: IClerkService,
    private readonly erpRoles: ErpRoleLookupService,
    @InjectPinoLogger(ListUsersQueryHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: ListUsersQuery): Promise<ClerkUserListResponse> {
    this.logger.info(`Executing ${ListUsersQuery.name}`);
    const result = await this.clerkService.listUsersAsync({
      limit:          query.limit,
      offset:         query.offset,
      organizationId: query.organizationId,
    });

    const response         = new ClerkUserListResponse();
    response.totalCount    = result.totalCount;
    response.data          = result.data.map((u) => Object.assign(new ClerkUserResponse(), u));
    return enrichClerkUsersWithErpRoles(response, this.erpRoles);
  }
}
