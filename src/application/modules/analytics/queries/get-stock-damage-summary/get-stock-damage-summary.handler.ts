import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { QueryHandlerStrict } from 'src/common';
import { GetStockDamageSummaryQuery } from './get-stock-damage-summary.query';
import { StockDamageSummaryResponse } from '../../models';

interface TotalsRow {
  totalUnits: string;
  eventCount: string;
}

interface ProductRow {
  productId: string;
  productName: string;
  quantity: string;
}

const TOTALS_SQL = `
  SELECT
    COALESCE(SUM(COALESCE((pl.metadata->>'quantity')::numeric, 0)), 0) AS "totalUnits",
    COUNT(*) AS "eventCount"
  FROM core.product_logs pl
  WHERE pl.organization_id = $1
    AND pl.action IN ('stock_damaged', 'stock_written_off')
    AND pl.created_at >= $2
    AND pl.created_at <= $3
    AND ($4::uuid IS NULL OR pl.location_id = $4)
`;

const TOP_SQL = `
  SELECT
    pl.product_id AS "productId",
    p.name AS "productName",
    COALESCE(SUM(COALESCE((pl.metadata->>'quantity')::numeric, 0)), 0) AS quantity
  FROM core.product_logs pl
  JOIN core.products p ON p.id = pl.product_id
  WHERE pl.organization_id = $1
    AND pl.action IN ('stock_damaged', 'stock_written_off')
    AND pl.created_at >= $2
    AND pl.created_at <= $3
    AND ($4::uuid IS NULL OR pl.location_id = $4)
  GROUP BY pl.product_id, p.name
  HAVING COALESCE(SUM(COALESCE((pl.metadata->>'quantity')::numeric, 0)), 0) > 0
  ORDER BY quantity DESC
  LIMIT $5
`;

@QueryHandlerStrict(GetStockDamageSummaryQuery)
export class GetStockDamageSummaryHandler
  implements IQueryHandler<GetStockDamageSummaryQuery, StockDamageSummaryResponse>
{
  public constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectPinoLogger(GetStockDamageSummaryHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: GetStockDamageSummaryQuery): Promise<StockDamageSummaryResponse> {
    this.logger.info(`Executing Query '${GetStockDamageSummaryQuery.name}'`);

    const params = [query.organizationId, query.from, query.to, query.locationId ?? null];

    const [[totals], products] = await Promise.all([
      this.dataSource.query<TotalsRow[]>(TOTALS_SQL, params),
      this.dataSource.query<ProductRow[]>(TOP_SQL, [...params, query.limit]),
    ]);

    return {
      totalUnits: Number(totals?.totalUnits ?? 0),
      eventCount: Number(totals?.eventCount ?? 0),
      topProducts: products.map((row) => ({
        productId: row.productId,
        productName: row.productName,
        quantity: Number(row.quantity),
        value: 0,
      })),
    };
  }
}
