import { QueryBase } from 'src/common';

export class GetTopMarginProductsQuery extends QueryBase {
  public organizationId: string;
  public from: Date;
  public to: Date;
  public locationId?: string;
  public limit: number;
}
