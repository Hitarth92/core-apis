import { createMap, forMember, mapFrom, Mapper } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { CustomerEntity } from '../../../../infrastructure/persistence/entities';
import { CustomerCreditTransaction } from '../../credit-approvals/domain';
import { Customer } from '../domain';
import {
  CreateCustomerRequest,
  UpdateCustomerRequest,
  SearchCustomersRequest,
  CustomerResponse,
  CustomerCreditTransactionResponse,
} from '../models';
import { CreateCustomerCommand } from '../commands/create-customer';
import { UpdateCustomerCommand } from '../commands/update-customer';
import { SearchCustomersQuery } from '../queries/search-customers';

function computeCreditStatus(c: Customer): string {
  if (!c.creditLimit || c.creditLimit <= 0) return 'none';
  const balance = c.creditBalance ?? 0;
  if (balance >= c.creditLimit) return 'over';
  if (balance >= c.creditLimit * 0.9) return 'warning';
  return 'available';
}

@Injectable()
export class CustomerProfile extends AutomapperProfile {
  constructor(@InjectMapper() mapper: Mapper) { super(mapper); }

  public get profile() {
    return (mapper: Mapper) => {
      createMap(mapper, CustomerEntity, Customer);
      createMap(mapper, Customer, CustomerEntity);
      createMap(
        mapper,
        Customer,
        CustomerResponse,
        forMember((d) => d.creditStatus, mapFrom((s) => computeCreditStatus(s))),
      );
      createMap(mapper, CreateCustomerRequest, CreateCustomerCommand);
      createMap(mapper, CreateCustomerCommand, Customer);
      createMap(mapper, UpdateCustomerRequest, UpdateCustomerCommand);
      createMap(mapper, UpdateCustomerCommand, Customer);
      createMap(mapper, SearchCustomersRequest, SearchCustomersQuery);
      createMap(mapper, CustomerCreditTransaction, CustomerCreditTransactionResponse);
    };
  }
}
