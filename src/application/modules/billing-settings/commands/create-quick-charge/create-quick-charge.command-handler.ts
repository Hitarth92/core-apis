import { Inject } from '@nestjs/common';
import { ICommandHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CommandHandlerStrict } from '../../../../../common';
import { QUICK_CHARGE_REPO } from '../../../../constants';
import { QuickCharge } from '../../domain';
import { IQuickChargeRepo } from '../../i-quick-charge.repo';
import { CreateQuickChargeCommand } from './create-quick-charge.command';

@CommandHandlerStrict(CreateQuickChargeCommand)
export class CreateQuickChargeCommandHandler implements ICommandHandler<CreateQuickChargeCommand, QuickCharge> {
  constructor(
    @Inject(QUICK_CHARGE_REPO) private readonly repo: IQuickChargeRepo,
    @InjectPinoLogger(CreateQuickChargeCommandHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(command: CreateQuickChargeCommand): Promise<QuickCharge> {
    this.logger.info(`Executing ${CreateQuickChargeCommand.name}`);
    return this.repo.createAsync({
      organizationId: command.organizationId,
      label: command.label,
      amount: command.amount,
      enabled: command.enabled ?? true,
      sortOrder: command.sortOrder ?? 0,
    } as never);
  }
}
