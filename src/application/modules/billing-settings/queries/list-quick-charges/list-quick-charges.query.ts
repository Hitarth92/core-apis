import { QueryBase } from '../../../../../common';

export class ListQuickChargesQuery extends QueryBase {
  public organizationId: string;
  public enabled?: boolean;
}
