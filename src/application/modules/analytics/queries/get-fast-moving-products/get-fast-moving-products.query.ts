import { QueryBase } from 'src/common';

export class GetFastMovingProductsQuery extends QueryBase {
  public organizationId: string;
  public from: Date;
  public to: Date;
  public locationId?: string;
  public limit: number;
}
