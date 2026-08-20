import { QueryBase } from 'src/common';

export class GetPaymentMixQuery extends QueryBase {
  public organizationId: string;
  public from: Date;
  public to: Date;
  public locationId?: string;
}
