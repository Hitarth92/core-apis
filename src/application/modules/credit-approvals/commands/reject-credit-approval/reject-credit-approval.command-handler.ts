import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { ICommandHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CommandHandlerStrict } from '../../../../../common';
import { CREDIT_APPROVAL_REQUEST_REPO, BILL_REPO } from '../../../../constants';
import { ECreditApprovalStatus } from '../../../../../infrastructure/persistence/entities/credit-approval-request.entity';
import { EBillStatus } from '../../../../../infrastructure/persistence/entities/bill.entity';
import { CreditApprovalRequest } from '../../domain';
import { ICreditApprovalRequestRepo } from '../../i-credit-approval-request.repo';
import { IBillRepo } from '../../../bills/i-bill.repo';
import { RejectCreditApprovalCommand } from './reject-credit-approval.command';

@CommandHandlerStrict(RejectCreditApprovalCommand)
export class RejectCreditApprovalCommandHandler
  implements ICommandHandler<RejectCreditApprovalCommand, CreditApprovalRequest>
{
  constructor(
    @Inject(CREDIT_APPROVAL_REQUEST_REPO) private readonly repo: ICreditApprovalRequestRepo,
    @Inject(BILL_REPO) private readonly billRepo: IBillRepo,
    @InjectPinoLogger(RejectCreditApprovalCommandHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(command: RejectCreditApprovalCommand): Promise<CreditApprovalRequest> {
    this.logger.info(`Executing ${RejectCreditApprovalCommand.name} id=${command.id}`);
    const request = await this.repo.getAsync(command.id);
    if (!request) throw new NotFoundException(`CreditApprovalRequest ${command.id} not found`);
    if (request.status !== ECreditApprovalStatus.Pending) {
      throw new BadRequestException(`Credit approval is already ${request.status}`);
    }

    request.status = ECreditApprovalStatus.Rejected;
    request.decidedById = command.decidedById;
    request.decidedAt = new Date();

    const bill = await this.billRepo.getAsync(request.billId);
    bill.status = EBillStatus.Cancelled;
    await this.billRepo.updateAsync(bill);

    return this.repo.updateAsync(request);
  }
}
