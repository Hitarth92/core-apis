import { AutoMap } from '@automapper/classes';
import { ECustomerType } from '../../../../infrastructure/persistence/entities';

export class Customer {
  @AutoMap() public id: string;
  @AutoMap() public organizationId: string;
  @AutoMap() public name: string;
  @AutoMap() public email?: string;
  @AutoMap() public phone?: string;
  @AutoMap() public gstin?: string;
  @AutoMap() public creditLimit?: number;
  @AutoMap() public creditBalance: number;
  @AutoMap(() => String) public customerType?: ECustomerType;
  @AutoMap() public discountPercent?: number | null;
  @AutoMap() public skipOverLimitApproval?: boolean | null;
  @AutoMap(() => Date) public createdAt: Date;
  @AutoMap(() => Date) public updatedAt?: Date;
  @AutoMap(() => Date) public deletedAt?: Date;
}
