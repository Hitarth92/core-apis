import { Inject } from '@nestjs/common';
import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { QueryHandlerStrict } from '../../../../../common';
import { CREDIT_APPROVAL_REQUEST_REPO } from '../../../../constants';
import { ECreditApprovalStatus } from '../../../../../infrastructure/persistence/entities/credit-approval-request.entity';
import { CreditApprovalRequest } from '../../domain';
import { ICreditApprovalRequestRepo } from '../../i-credit-approval-request.repo';
import { ListPendingCreditApprovalsQuery } from './list-pending-credit-approvals.query';

@QueryHandlerStrict(ListPendingCreditApprovalsQuery)
export class ListPendingCreditApprovalsQueryHandler
  implements IQueryHandler<ListPendingCreditApprovalsQuery, CreditApprovalRequest[]>
{
  constructor(
    @Inject(CREDIT_APPROVAL_REQUEST_REPO) private readonly repo: ICreditApprovalRequestRepo,
    @InjectPinoLogger(ListPendingCreditApprovalsQueryHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: ListPendingCreditApprovalsQuery): Promise<CreditApprovalRequest[]> {
    this.logger.info(`Executing ${ListPendingCreditApprovalsQuery.name}`);
    return this.repo.allAsync({
      organizationId: query.organizationId,
      status: ECreditApprovalStatus.Pending,
    });
  }
}
