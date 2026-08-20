import { QueryBase } from 'src/common';

export class GetDeadStockQuery extends QueryBase {
  public organizationId: string;
  public locationId?: string;
  public limit: number;
  /** Days without a completed sale to classify as dead stock. */
  public staleDays: number;
}
