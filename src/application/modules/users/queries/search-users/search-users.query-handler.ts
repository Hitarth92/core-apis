import { Inject } from '@nestjs/common';
import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { QueryHandlerStrict, CLERK_SERVICE, IClerkService } from '../../../../../common';
import { ClerkUserListResponse, ClerkUserResponse } from '../../models';
import { ErpRoleLookupService } from '../../services';
import { enrichClerkUsersWithErpRoles } from '../enrich-clerk-users-erp-roles';
import { SearchUsersQuery } from './search-users.query';

@QueryHandlerStrict(SearchUsersQuery)
export class SearchUsersQueryHandler implements IQueryHandler<SearchUsersQuery, ClerkUserListResponse> {
  constructor(
    @Inject(CLERK_SERVICE) private readonly clerkService: IClerkService,
    private readonly erpRoles: ErpRoleLookupService,
    @InjectPinoLogger(SearchUsersQueryHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: SearchUsersQuery): Promise<ClerkUserListResponse> {
    this.logger.info(`Executing ${SearchUsersQuery.name} query=${query.query}`);
    const result = await this.clerkService.searchUsersAsync({
      query:  query.query,
      limit:  query.limit,
      offset: query.offset,
    });

    const response      = new ClerkUserListResponse();
    response.totalCount = result.totalCount;
    response.data       = result.data.map((u) => Object.assign(new ClerkUserResponse(), u));
    return enrichClerkUsersWithErpRoles(response, this.erpRoles);
  }
}
