import { QueryBase } from 'src/common';

export class GetInventoryStatusQuery extends QueryBase {
  public organizationId: string;
  public locationId?: string;
  public staleDays: number;
}
