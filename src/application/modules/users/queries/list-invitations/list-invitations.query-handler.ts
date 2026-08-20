import { Inject } from '@nestjs/common';
import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { QueryHandlerStrict, CLERK_SERVICE, IClerkService } from '../../../../../common';
import { ClerkInvitationResponse } from '../../models';
import { ListInvitationsQuery } from './list-invitations.query';

@QueryHandlerStrict(ListInvitationsQuery)
export class ListInvitationsQueryHandler implements IQueryHandler<ListInvitationsQuery, ClerkInvitationResponse[]> {
  public constructor(
    @Inject(CLERK_SERVICE) private readonly clerkService: IClerkService,
    @InjectPinoLogger(ListInvitationsQueryHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: ListInvitationsQuery): Promise<ClerkInvitationResponse[]> {
    this.logger.info(`Executing ${ListInvitationsQuery.name} status=${query.status ?? 'all'}`);
    return this.clerkService.listInvitationsAsync({ status: query.status });
  }
}
