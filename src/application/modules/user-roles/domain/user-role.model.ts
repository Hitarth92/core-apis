import { AutoMap } from '@automapper/classes';

export class UserRole {
  @AutoMap() public id: string;
  @AutoMap() public userId: string;
  @AutoMap() public roleId: string;
  /** Optional scope — null/undefined means org-wide, set means scoped to a specific location */
  @AutoMap() public locationId?: string;
  @AutoMap(() => Date) public createdAt?: Date;
}
