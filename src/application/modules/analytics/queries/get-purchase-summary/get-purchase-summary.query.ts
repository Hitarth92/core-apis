import { QueryBase } from 'src/common';

export class GetPurchaseSummaryQuery extends QueryBase {
  public organizationId: string;
  public from?: Date;
  public to?: Date;
  public locationId?: string;
}
