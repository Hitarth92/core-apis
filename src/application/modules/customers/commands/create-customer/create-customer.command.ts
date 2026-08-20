import { AutoMap } from '@automapper/classes';
import { CommandBase } from '../../../../../common';
import { ECustomerType } from '../../../../../infrastructure/persistence/entities';

export class CreateCustomerCommand extends CommandBase {
  @AutoMap() public organizationId: string;
  @AutoMap() public name: string;
  @AutoMap() public email?: string;
  @AutoMap() public phone?: string;
  @AutoMap() public gstin?: string;
  @AutoMap() public creditLimit?: number;
  @AutoMap(() => String) public customerType?: ECustomerType;
  @AutoMap() public discountPercent?: number | null;
  @AutoMap() public skipOverLimitApproval?: boolean | null;
}
