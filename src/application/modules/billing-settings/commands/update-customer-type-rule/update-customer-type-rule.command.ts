import { AutoMap } from '@automapper/classes';
import { CommandBase } from '../../../../../common';

export class UpdateCustomerTypeRuleCommand extends CommandBase {
  public id: string;
  public organizationId: string;
  @AutoMap() public discountPercent?: number;
  @AutoMap() public defaultCreditLimit?: number | null;
  @AutoMap() public skipOverLimitApproval?: boolean;
}
