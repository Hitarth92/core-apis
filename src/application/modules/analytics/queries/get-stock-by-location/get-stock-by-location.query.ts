import { QueryBase } from 'src/common';

export class GetStockByLocationQuery extends QueryBase {
  public organizationId: string;
  public locationId?: string;
}
