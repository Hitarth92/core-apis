import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { QueryHandlerStrict } from 'src/common';
import { GetPurchaseTrendQuery } from './get-purchase-trend.query';
import { PurchaseTrendPointResponse } from '../../models';

interface RawPurchaseTrendRow {
  period: string;
  spend: string;
  poCount: string;
}

function formatExpr(trunc: string): string {
  if (trunc === 'hour') return `TO_CHAR(DATE_TRUNC('hour', created_at), 'YYYY-MM-DD HH24:00')`;
  if (trunc === 'day') return `TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD')`;
  return `TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM')`;
}

@QueryHandlerStrict(GetPurchaseTrendQuery)
export class GetPurchaseTrendHandler implements IQueryHandler<GetPurchaseTrendQuery, PurchaseTrendPointResponse[]> {
  public constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectPinoLogger(GetPurchaseTrendHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: GetPurchaseTrendQuery): Promise<PurchaseTrendPointResponse[]> {
    this.logger.info(`Executing Query '${GetPurchaseTrendQuery.name}'`);

    const trunc = query.trunc ?? 'month';
    const labelExpr = formatExpr(trunc);

    const sql = `
      SELECT
        ${labelExpr} AS period,
        COALESCE(SUM(total_amount), 0) AS spend,
        COUNT(*) AS "poCount"
      FROM core.purchase_orders
      WHERE organization_id = $1
        AND status = 'received'
        AND created_at >= $2
        AND created_at <= $3
        AND ($4::uuid IS NULL OR location_id = $4)
      GROUP BY DATE_TRUNC('${trunc}', created_at)
      ORDER BY DATE_TRUNC('${trunc}', created_at)
    `;

    const rows = await this.dataSource.query<RawPurchaseTrendRow[]>(sql, [
      query.organizationId,
      query.from!,
      query.to!,
      query.locationId ?? null,
    ]);

    return rows.map((row) => ({
      month: row.period,
      spend: Number(row.spend),
      poCount: Number(row.poCount),
    }));
  }
}
