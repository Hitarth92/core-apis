import { Inject } from '@nestjs/common';
import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { QueryHandlerStrict } from '../../../../../common';
import { CREDIT_APPROVAL_REQUEST_REPO } from '../../../../constants';
import { CreditApprovalRequest } from '../../domain';
import { ICreditApprovalRequestRepo } from '../../i-credit-approval-request.repo';
import { ListMyCreditApprovalsQuery } from './list-my-credit-approvals.query';

@QueryHandlerStrict(ListMyCreditApprovalsQuery)
export class ListMyCreditApprovalsQueryHandler
  implements IQueryHandler<ListMyCreditApprovalsQuery, CreditApprovalRequest[]>
{
  constructor(
    @Inject(CREDIT_APPROVAL_REQUEST_REPO) private readonly repo: ICreditApprovalRequestRepo,
    @InjectPinoLogger(ListMyCreditApprovalsQueryHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: ListMyCreditApprovalsQuery): Promise<CreditApprovalRequest[]> {
    this.logger.info(`Executing ${ListMyCreditApprovalsQuery.name}`);
    return this.repo.allAsync({
      organizationId: query.organizationId,
      requestedById: query.requestedById,
      status: query.status,
    });
  }
}
