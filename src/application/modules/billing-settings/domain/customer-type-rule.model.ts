import { AutoMap } from '@automapper/classes';
import { ECustomerType } from '../../../../infrastructure/persistence/entities';

export class CustomerTypeRule {
  @AutoMap() public id: string;
  @AutoMap() public organizationId: string;
  @AutoMap(() => String) public customerType: ECustomerType;
  @AutoMap() public discountPercent: number;
  @AutoMap() public defaultCreditLimit?: number | null;
  @AutoMap() public skipOverLimitApproval: boolean;
  @AutoMap(() => Date) public createdAt: Date;
  @AutoMap(() => Date) public updatedAt?: Date;
}
