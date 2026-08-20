import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { QueryHandlerStrict } from 'src/common';
import { GetPurchaseSummaryQuery } from './get-purchase-summary.query';
import { PurchaseSummaryResponse } from '../../models';

interface RawPurchaseSummary {
  spendInPeriod: string;
  outstandingPos: string;
  avgPoValue: string;
  supplierCount: string;
}

@QueryHandlerStrict(GetPurchaseSummaryQuery)
export class GetPurchaseSummaryHandler implements IQueryHandler<GetPurchaseSummaryQuery, PurchaseSummaryResponse> {
  public constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectPinoLogger(GetPurchaseSummaryHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: GetPurchaseSummaryQuery): Promise<PurchaseSummaryResponse> {
    this.logger.info(`Executing Query '${GetPurchaseSummaryQuery.name}'`);

    const hasRange = query.from && query.to;
    const dateClause = hasRange
      ? `AND created_at >= $2 AND created_at <= $3`
      : '';
    const locParam = hasRange ? 4 : 2;

    const sql = `
      SELECT
        COALESCE(SUM(CASE WHEN status = 'received' ${hasRange ? `AND created_at >= $2 AND created_at <= $3` : `AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())`} THEN total_amount ELSE 0 END), 0) AS "spendInPeriod",
        COUNT(CASE WHEN status IN ('ordered', 'partially_received') THEN 1 END) AS "outstandingPos",
        COALESCE(AVG(CASE WHEN status = 'received' THEN total_amount END), 0) AS "avgPoValue",
        COUNT(DISTINCT supplier_id) AS "supplierCount"
      FROM core.purchase_orders
      WHERE organization_id = $1
        AND ($${locParam}::uuid IS NULL OR location_id = $${locParam})
    `;

    const params: unknown[] = [query.organizationId];
    if (hasRange) params.push(query.from, query.to);
    params.push(query.locationId ?? null);

    const [summary] = await this.dataSource.query<RawPurchaseSummary[]>(sql, params);
    const spend = Number(summary.spendInPeriod);
    return {
      spendThisMonth: spend,
      outstandingPos: Number(summary.outstandingPos),
      avgPoValue: Number(summary.avgPoValue),
      supplierCount: Number(summary.supplierCount),
    };
  }
}
