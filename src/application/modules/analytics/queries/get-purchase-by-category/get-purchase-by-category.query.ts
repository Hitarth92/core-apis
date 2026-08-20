import { QueryBase } from 'src/common';

export class GetPurchaseByCategoryQuery extends QueryBase {
  public organizationId: string;
  public from: Date;
  public to: Date;
  public locationId?: string;
}
