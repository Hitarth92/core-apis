import { ForbiddenException, Inject, NotFoundException } from '@nestjs/common';
import { ICommandHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CommandHandlerStrict } from '../../../../../common';
import { QUICK_CHARGE_REPO } from '../../../../constants';
import { IQuickChargeRepo } from '../../i-quick-charge.repo';
import { DeleteQuickChargeCommand } from './delete-quick-charge.command';

@CommandHandlerStrict(DeleteQuickChargeCommand)
export class DeleteQuickChargeCommandHandler implements ICommandHandler<DeleteQuickChargeCommand, boolean> {
  constructor(
    @Inject(QUICK_CHARGE_REPO) private readonly repo: IQuickChargeRepo,
    @InjectPinoLogger(DeleteQuickChargeCommandHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(command: DeleteQuickChargeCommand): Promise<boolean> {
    this.logger.info(`Executing ${DeleteQuickChargeCommand.name} id=${command.id}`);
    const existing = await this.repo.getAsync(command.id);
    if (!existing) throw new NotFoundException(`Quick charge ${command.id} not found`);
    if (existing.organizationId !== command.organizationId) {
      throw new ForbiddenException('Quick charge belongs to another organization');
    }
    return this.repo.deleteAsync(command.id);
  }
}
