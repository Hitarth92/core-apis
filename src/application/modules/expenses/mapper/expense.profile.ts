import { createMap, Mapper } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { ExpenseEntity } from '../../../../infrastructure/persistence/entities/expense.entity';
import { Expense } from '../domain';
import { CreateExpenseRequest, ExpenseResponse } from '../models';
import { CreateExpenseCommand } from '../commands';

@Injectable()
export class ExpenseProfile extends AutomapperProfile {
  constructor(@InjectMapper() mapper: Mapper) { super(mapper); }

  public get profile() {
    return (mapper: Mapper) => {
      createMap(mapper, ExpenseEntity, Expense);
      createMap(mapper, Expense, ExpenseEntity);
      createMap(mapper, CreateExpenseRequest, CreateExpenseCommand);
      createMap(mapper, Expense, ExpenseResponse);
    };
  }
}
