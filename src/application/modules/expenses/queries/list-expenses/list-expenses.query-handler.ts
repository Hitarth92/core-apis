import { Inject } from '@nestjs/common';
import { IQueryHandler } from '@nestjs/cqrs';
import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { QueryHandlerStrict } from '../../../../../common';
import { EXPENSE_REPO } from '../../../../constants';
import { Expense } from '../../domain';
import { IExpenseRepo } from '../..';
import { ExpenseResponse } from '../../models';
import { ListExpensesQuery } from './list-expenses.query';

@QueryHandlerStrict(ListExpensesQuery)
export class ListExpensesQueryHandler implements IQueryHandler<ListExpensesQuery, ExpenseResponse[]> {
  public constructor(
    @Inject(EXPENSE_REPO) private readonly repo: IExpenseRepo,
    @InjectMapper() private readonly mapper: Mapper,
    @InjectPinoLogger(ListExpensesQueryHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: ListExpensesQuery): Promise<ExpenseResponse[]> {
    this.logger.info(`Executing ${ListExpensesQuery.name}`);
    let expenses = await this.repo.allAsync();
    // ponytail: in-memory org/status filter until ExpenseRepo grows a Filter
    if (query.organizationId) {
      expenses = expenses.filter((expense) => expense.organizationId === query.organizationId);
    }
    if (query.status) {
      expenses = expenses.filter((expense) => expense.status === query.status);
    }
    return this.mapper.mapArray(expenses, Expense, ExpenseResponse);
  }
}
