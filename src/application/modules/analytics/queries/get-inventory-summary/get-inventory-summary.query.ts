import { QueryBase } from 'src/common';

export class GetInventorySummaryQuery extends QueryBase {
  public organizationId: string;
  public locationId?: string;
}
