import { createMap, Mapper } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { CustomerTypeRuleEntity, QuickChargeEntity } from '../../../../infrastructure/persistence/entities';
import { CreateQuickChargeCommand } from '../commands/create-quick-charge';
import { UpdateCustomerTypeRuleCommand } from '../commands/update-customer-type-rule';
import { UpdateQuickChargeCommand } from '../commands/update-quick-charge';
import { CustomerTypeRule, QuickCharge } from '../domain';
import {
  CreateQuickChargeRequest,
  CustomerTypeRuleResponse,
  QuickChargeResponse,
  UpdateCustomerTypeRuleRequest,
  UpdateQuickChargeRequest,
} from '../models';

@Injectable()
export class BillingSettingsProfile extends AutomapperProfile {
  constructor(@InjectMapper() mapper: Mapper) { super(mapper); }

  public get profile() {
    return (mapper: Mapper) => {
      createMap(mapper, QuickChargeEntity, QuickCharge);
      createMap(mapper, QuickCharge, QuickChargeEntity);
      createMap(mapper, QuickCharge, QuickChargeResponse);
      createMap(mapper, CreateQuickChargeRequest, CreateQuickChargeCommand);
      createMap(mapper, UpdateQuickChargeRequest, UpdateQuickChargeCommand);

      createMap(mapper, CustomerTypeRuleEntity, CustomerTypeRule);
      createMap(mapper, CustomerTypeRule, CustomerTypeRuleEntity);
      createMap(mapper, CustomerTypeRule, CustomerTypeRuleResponse);
      createMap(mapper, UpdateCustomerTypeRuleRequest, UpdateCustomerTypeRuleCommand);
    };
  }
}
