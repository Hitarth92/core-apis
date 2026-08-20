import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { FindManyOptions, MoreThan, Repository } from 'typeorm';
import { BaseRepo, Filter, PageableFilter } from '../../../common';
import { CustomerEntity } from '../entities';
import { Customer } from '../../../application/modules/customers/domain';
import { ICustomerRepo, CustomerFilter } from '../../../application/modules/customers';

@Injectable()
export class CustomerRepo extends BaseRepo<CustomerEntity, Customer, string, PageableFilter<CustomerFilter>, Filter<CustomerFilter>> implements ICustomerRepo {
  constructor(
    @InjectRepository(CustomerEntity) internalRepo: Repository<CustomerEntity>,
    @InjectMapper() mapper: Mapper,
    @InjectPinoLogger(CustomerRepo.name) logger: PinoLogger,
  ) {
    super(internalRepo, mapper, logger, CustomerEntity, Customer);
  }

  public override get idColumnName(): keyof CustomerEntity {
    return 'id';
  }

  public override get softDeleteEnabled(): boolean {
    return true;
  }

  public override get specialFilterFields(): (keyof PageableFilter<CustomerFilter>)[] {
    return [...super.specialFilterFields, 'hasCreditLimit'];
  }

  protected override modifyFindOption(
    findOpts: FindManyOptions<CustomerEntity>,
    filterObj: Filter<CustomerFilter> | PageableFilter<CustomerFilter>,
  ): void {
    if (filterObj.hasCreditLimit === true) {
      (findOpts.where as Record<string, unknown>).creditLimit = MoreThan(0);
    }
  }
}
