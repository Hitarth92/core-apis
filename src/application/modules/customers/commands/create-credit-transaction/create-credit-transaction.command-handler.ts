import { BadRequestException, ForbiddenException, Inject, NotFoundException } from '@nestjs/common';
import { ICommandHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CommandHandlerStrict } from '../../../../../common';
import { CUSTOMER_REPO, CUSTOMER_CREDIT_TRANSACTION_REPO } from '../../../../constants';
import { ECreditTransactionType } from '../../../../../infrastructure/persistence/entities/customer-credit-transaction.entity';
import { CustomerCreditTransaction } from '../../../credit-approvals/domain';
import { ICustomerCreditTransactionRepo } from '../../../credit-approvals/i-customer-credit-transaction.repo';
import { Customer } from '../../domain';
import { ICustomerRepo } from '../../i-customer.repo';
import { CreateCreditTransactionCommand } from './create-credit-transaction.command';

@CommandHandlerStrict(CreateCreditTransactionCommand)
export class CreateCreditTransactionCommandHandler
  implements ICommandHandler<CreateCreditTransactionCommand, Customer>
{
  constructor(
    @Inject(CUSTOMER_REPO) private readonly customerRepo: ICustomerRepo,
    @Inject(CUSTOMER_CREDIT_TRANSACTION_REPO) private readonly txRepo: ICustomerCreditTransactionRepo,
    @InjectPinoLogger(CreateCreditTransactionCommandHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(command: CreateCreditTransactionCommand): Promise<Customer> {
    this.logger.info(`Executing ${CreateCreditTransactionCommand.name} customerId=${command.customerId} type=${command.type}`);

    const customer = await this.customerRepo.getAsync(command.customerId);
    if (!customer) throw new NotFoundException(`Customer ${command.customerId} not found`);
    if (customer.organizationId !== command.organizationId) {
      throw new ForbiddenException('Customer does not belong to your organization');
    }

    if (command.type === 'payment' && command.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }

    const balanceBefore = customer.creditBalance ?? 0;
    const delta = command.type === 'payment' ? -command.amount : command.amount;
    const balanceAfter = balanceBefore + delta;

    const tx = new CustomerCreditTransaction();
    tx.customerId    = command.customerId;
    tx.type          = command.type === 'payment' ? ECreditTransactionType.Payment : ECreditTransactionType.Adjustment;
    tx.amount        = Math.abs(command.amount);
    tx.balanceBefore = balanceBefore;
    tx.balanceAfter  = balanceAfter;
    tx.paymentMethod = command.paymentMethod;
    tx.note          = command.note;
    tx.performedById = command.performedById;

    await this.txRepo.createAsync(tx);

    customer.creditBalance = balanceAfter;
    return this.customerRepo.updateAsync(customer);
  }
}
