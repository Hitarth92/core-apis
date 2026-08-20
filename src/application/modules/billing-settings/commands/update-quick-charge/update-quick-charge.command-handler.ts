import { ForbiddenException, Inject, NotFoundException } from '@nestjs/common';
import { ICommandHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CommandHandlerStrict } from '../../../../../common';
import { QUICK_CHARGE_REPO } from '../../../../constants';
import { QuickCharge } from '../../domain';
import { IQuickChargeRepo } from '../../i-quick-charge.repo';
import { UpdateQuickChargeCommand } from './update-quick-charge.command';

@CommandHandlerStrict(UpdateQuickChargeCommand)
export class UpdateQuickChargeCommandHandler implements ICommandHandler<UpdateQuickChargeCommand, QuickCharge> {
  constructor(
    @Inject(QUICK_CHARGE_REPO) private readonly repo: IQuickChargeRepo,
    @InjectPinoLogger(UpdateQuickChargeCommandHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(command: UpdateQuickChargeCommand): Promise<QuickCharge> {
    this.logger.info(`Executing ${UpdateQuickChargeCommand.name} id=${command.id}`);
    const existing = await this.repo.getAsync(command.id);
    if (!existing) throw new NotFoundException(`Quick charge ${command.id} not found`);
    if (existing.organizationId !== command.organizationId) {
      throw new ForbiddenException('Quick charge belongs to another organization');
    }
    const patch = Object.fromEntries(
      Object.entries({
        label: command.label,
        amount: command.amount,
        enabled: command.enabled,
        sortOrder: command.sortOrder,
      }).filter(([, val]) => val !== undefined),
    );
    return this.repo.updateAsync({ ...existing, ...patch });
  }
}
