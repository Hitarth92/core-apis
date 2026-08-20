import { AutoMap } from '@automapper/classes';
import { QueryBase } from '../../../../../common';

export class ListMyCreditApprovalsQuery extends QueryBase {
  @AutoMap() public organizationId: string;
  @AutoMap() public requestedById: string;
  @AutoMap() public status: string;
}
