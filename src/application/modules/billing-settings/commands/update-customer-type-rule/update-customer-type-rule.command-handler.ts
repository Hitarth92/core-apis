import { ForbiddenException, Inject, NotFoundException } from '@nestjs/common';
import { ICommandHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CommandHandlerStrict } from '../../../../../common';
import { CUSTOMER_TYPE_RULE_REPO } from '../../../../constants';
import { CustomerTypeRule } from '../../domain';
import { ICustomerTypeRuleRepo } from '../../i-customer-type-rule.repo';
import { UpdateCustomerTypeRuleCommand } from './update-customer-type-rule.command';

@CommandHandlerStrict(UpdateCustomerTypeRuleCommand)
export class UpdateCustomerTypeRuleCommandHandler implements ICommandHandler<UpdateCustomerTypeRuleCommand, CustomerTypeRule> {
  constructor(
    @Inject(CUSTOMER_TYPE_RULE_REPO) private readonly repo: ICustomerTypeRuleRepo,
    @InjectPinoLogger(UpdateCustomerTypeRuleCommandHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(command: UpdateCustomerTypeRuleCommand): Promise<CustomerTypeRule> {
    this.logger.info(`Executing ${UpdateCustomerTypeRuleCommand.name} id=${command.id}`);
    const existing = await this.repo.getAsync(command.id);
    if (!existing) throw new NotFoundException(`Customer type rule ${command.id} not found`);
    if (existing.organizationId !== command.organizationId) {
      throw new ForbiddenException('Customer type rule belongs to another organization');
    }
    const patch = Object.fromEntries(
      Object.entries({
        discountPercent: command.discountPercent,
        defaultCreditLimit: command.defaultCreditLimit,
        skipOverLimitApproval: command.skipOverLimitApproval,
      }).filter(([, val]) => val !== undefined),
    );
    return this.repo.updateAsync({ ...existing, ...patch });
  }
}
