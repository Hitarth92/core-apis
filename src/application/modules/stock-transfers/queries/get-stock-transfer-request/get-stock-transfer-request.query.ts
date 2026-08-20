import { AutoMap } from '@automapper/classes';
import { QueryBase } from '../../../../../common';

export class GetStockTransferRequestQuery extends QueryBase {
  @AutoMap() public id: string;
}
