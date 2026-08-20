import { QueryBase } from 'src/common';

export class GetStockDamageSummaryQuery extends QueryBase {
  public organizationId: string;
  public from: Date;
  public to: Date;
  public locationId?: string;
  public limit: number;
}
