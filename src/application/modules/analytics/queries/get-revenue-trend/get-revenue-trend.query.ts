import { QueryBase } from 'src/common';
import type { AnalyticsTrunc } from '../../analytics-period.util';

export class GetRevenueTrendQuery extends QueryBase {
  public organizationId: string;
  public from: Date;
  public to: Date;
  public locationId?: string;
  public trunc?: AnalyticsTrunc;
}
