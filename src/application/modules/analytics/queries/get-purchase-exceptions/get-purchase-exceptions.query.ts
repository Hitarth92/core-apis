import { QueryBase } from 'src/common';

export class GetPurchaseExceptionsQuery extends QueryBase {
  public organizationId: string;
  public locationId?: string;
}
