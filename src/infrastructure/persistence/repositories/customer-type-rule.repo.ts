import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { BaseRepo, Filter, PageableFilter } from '../../../common';
import { CustomerTypeRuleEntity } from '../entities';
import { CustomerTypeRule } from '../../../application/modules/billing-settings/domain';
import { ICustomerTypeRuleRepo, CustomerTypeRuleFilter } from '../../../application/modules/billing-settings';

@Injectable()
export class CustomerTypeRuleRepo extends BaseRepo<CustomerTypeRuleEntity, CustomerTypeRule, string, PageableFilter<CustomerTypeRuleFilter>, Filter<CustomerTypeRuleFilter>> implements ICustomerTypeRuleRepo {
  constructor(
    @InjectRepository(CustomerTypeRuleEntity) internalRepo: Repository<CustomerTypeRuleEntity>,
    @InjectMapper() mapper: Mapper,
    @InjectPinoLogger(CustomerTypeRuleRepo.name) logger: PinoLogger,
  ) {
    super(internalRepo, mapper, logger, CustomerTypeRuleEntity, CustomerTypeRule);
  }

  public override get idColumnName(): keyof CustomerTypeRuleEntity {
    return 'id';
  }
}
