import { AutoMap } from '@automapper/classes';
import { QueryBase } from '../../../../../common';

export class ListUserDirectoryQuery extends QueryBase {
  @AutoMap() public organizationId: string;
}
