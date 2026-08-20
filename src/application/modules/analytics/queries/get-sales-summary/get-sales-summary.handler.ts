import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { QueryHandlerStrict } from 'src/common';
import { GetSalesSummaryQuery } from './get-sales-summary.query';
import { SalesSummaryResponse } from '../../models';

interface RawSummary {
  revenueInPeriod: string;
  avgBillValue: string;
  completedBills: string;
  pendingBills: string;
}

interface RawCustomerCount {
  activeCustomers: string;
}

@QueryHandlerStrict(GetSalesSummaryQuery)
export class GetSalesSummaryHandler implements IQueryHandler<GetSalesSummaryQuery, SalesSummaryResponse> {
  public constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectPinoLogger(GetSalesSummaryHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: GetSalesSummaryQuery): Promise<SalesSummaryResponse> {
    this.logger.info(`Executing Query '${GetSalesSummaryQuery.name}'`);

    const hasRange = query.from && query.to;
    const dateClause = hasRange ? `AND created_at >= $2 AND created_at <= $3` : '';
    const locParam = hasRange ? 4 : 2;

    const summarySql = `
      SELECT
        COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN total_amount ELSE 0 END), 0) AS "revenueInPeriod",
        COALESCE(AVG(CASE WHEN status = 'COMPLETED' THEN total_amount END), 0) AS "avgBillValue",
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) AS "completedBills",
        COUNT(CASE WHEN status IN ('INITIATED', 'DRAFT') THEN 1 END) AS "pendingBills"
      FROM core.bills
      WHERE organization_id = $1 AND deleted_at IS NULL
        ${dateClause}
        AND ($${locParam}::uuid IS NULL OR location_id = $${locParam})
    `;

    const customersSql = `
      SELECT COUNT(DISTINCT customer_id) AS "activeCustomers"
      FROM core.bills
      WHERE organization_id = $1
        AND customer_id IS NOT NULL
        AND status = 'COMPLETED'
        AND deleted_at IS NULL
        ${hasRange ? `AND created_at >= $2 AND created_at <= $3` : `AND created_at >= NOW() - INTERVAL '30 days'`}
        AND ($${hasRange ? 4 : 2}::uuid IS NULL OR location_id = $${hasRange ? 4 : 2})
    `;

    const params: unknown[] = [query.organizationId];
    if (hasRange) params.push(query.from, query.to);
    params.push(query.locationId ?? null);

    const [summary] = await this.dataSource.query<RawSummary[]>(summarySql, params);
    const [customers] = await this.dataSource.query<RawCustomerCount[]>(customersSql, params);

    const revenue = Number(summary.revenueInPeriod);
    return {
      revenueThisMonth: revenue,
      revenueThisWeek: revenue,
      avgBillValue: Number(summary.avgBillValue),
      completedBills: Number(summary.completedBills),
      pendingBills: Number(summary.pendingBills),
      activeCustomers: Number(customers.activeCustomers),
    };
  }
}
