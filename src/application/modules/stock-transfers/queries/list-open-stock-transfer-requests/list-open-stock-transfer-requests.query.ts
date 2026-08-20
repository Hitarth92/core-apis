import { AutoMap } from '@automapper/classes';
import { QueryBase } from '../../../../../common';

export class ListOpenStockTransferRequestsQuery extends QueryBase {
  @AutoMap() public organizationId: string;
  @AutoMap() public viewerLocationId: string;
}
