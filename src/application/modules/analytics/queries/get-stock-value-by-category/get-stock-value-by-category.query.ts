import { QueryBase } from 'src/common';

export class GetStockValueByCategoryQuery extends QueryBase {
  public organizationId: string;
  public locationId?: string;
}
