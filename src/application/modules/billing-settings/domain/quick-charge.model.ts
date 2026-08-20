import { AutoMap } from '@automapper/classes';

export class QuickCharge {
  @AutoMap() public id: string;
  @AutoMap() public organizationId: string;
  @AutoMap() public label: string;
  @AutoMap() public amount: number;
  @AutoMap() public enabled: boolean;
  @AutoMap() public sortOrder: number;
  @AutoMap(() => Date) public createdAt: Date;
  @AutoMap(() => Date) public updatedAt?: Date;
}
