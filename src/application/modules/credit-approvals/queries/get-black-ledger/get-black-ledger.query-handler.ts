import { Inject } from '@nestjs/common';
import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { QueryHandlerStrict } from '../../../../../common';
import { BILL_REPO, COMMISSION_PAYABLE_REPO } from '../../../../constants';
import { ESaleType } from '../../../../../infrastructure/persistence/entities';
import { Bill } from '../../../bills/domain';
import { IBillRepo } from '../../../bills';
import { CommissionPayable } from '../../domain';
import { ICommissionPayableRepo } from '../../i-commission-payable.repo';
import { GetBlackLedgerQuery } from './get-black-ledger.query';

export interface BlackLedgerResult {
  bills: Bill[];
  commissions: CommissionPayable[];
}

@QueryHandlerStrict(GetBlackLedgerQuery)
export class GetBlackLedgerQueryHandler implements IQueryHandler<GetBlackLedgerQuery, BlackLedgerResult> {
  constructor(
    @Inject(BILL_REPO) private readonly billRepo: IBillRepo,
    @Inject(COMMISSION_PAYABLE_REPO) private readonly commissionRepo: ICommissionPayableRepo,
    @InjectPinoLogger(GetBlackLedgerQueryHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: GetBlackLedgerQuery): Promise<BlackLedgerResult> {
    this.logger.info(`Executing ${GetBlackLedgerQuery.name}`);
    const [bills, commissions] = await Promise.all([
      this.billRepo.allAsync({
        organizationId: query.organizationId,
        saleType: ESaleType.Black,
      }),
      this.commissionRepo.allAsync({
        organizationId: query.organizationId,
      }),
    ]);
    return { bills, commissions };
  }
}
