import { AutoMap } from '@automapper/classes';
import { QueryBase } from '../../../../../common';

export class ListMyStockTransferRequestsQuery extends QueryBase {
  @AutoMap() public organizationId: string;
  @AutoMap() public locationId: string;
}
