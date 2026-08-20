import { AutoMap } from '@automapper/classes';
import { QueryBase } from '../../../../../common';

export class ListUserRolesQuery extends QueryBase {
  @AutoMap() public userId?: string;
  @AutoMap() public organizationId?: string;
}
