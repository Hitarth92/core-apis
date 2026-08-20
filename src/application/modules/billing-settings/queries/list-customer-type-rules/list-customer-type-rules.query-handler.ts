import { Inject } from '@nestjs/common';
import { IQueryHandler } from '@nestjs/cqrs';
import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { QueryHandlerStrict } from '../../../../../common';
import { CUSTOMER_TYPE_RULE_REPO } from '../../../../constants';
import { ECustomerType } from '../../../../../infrastructure/persistence/entities';
import { CustomerTypeRule } from '../../domain';
import { ICustomerTypeRuleRepo } from '../../i-customer-type-rule.repo';
import { CustomerTypeRuleResponse } from '../../models';
import { ListCustomerTypeRulesQuery } from './list-customer-type-rules.query';

const ALL_TYPES = Object.values(ECustomerType);

@QueryHandlerStrict(ListCustomerTypeRulesQuery)
export class ListCustomerTypeRulesQueryHandler implements IQueryHandler<ListCustomerTypeRulesQuery, CustomerTypeRuleResponse[]> {
  constructor(
    @Inject(CUSTOMER_TYPE_RULE_REPO) private readonly repo: ICustomerTypeRuleRepo,
    @InjectMapper() private readonly mapper: Mapper,
    @InjectPinoLogger(ListCustomerTypeRulesQueryHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: ListCustomerTypeRulesQuery): Promise<CustomerTypeRuleResponse[]> {
    this.logger.info(`Executing ${ListCustomerTypeRulesQuery.name}`);
    let rules = await this.repo.allAsync({ organizationId: query.organizationId });
    const missing = ALL_TYPES.filter((t) => !rules.some((r) => r.customerType === t));
    for (const customerType of missing) {
      try {
        await this.repo.createAsync({
          organizationId: query.organizationId,
          customerType,
          discountPercent: 0,
          skipOverLimitApproval: false,
        } as never);
      } catch {
        // ponytail: unique (org, type) — concurrent POS/settings loads
      }
    }
    if (missing.length) {
      rules = await this.repo.allAsync({ organizationId: query.organizationId });
    }
    rules.sort((a, b) => ALL_TYPES.indexOf(a.customerType) - ALL_TYPES.indexOf(b.customerType));
    return this.mapper.mapArray(rules, CustomerTypeRule, CustomerTypeRuleResponse);
  }
}
