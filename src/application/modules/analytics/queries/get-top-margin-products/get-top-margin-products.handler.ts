import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { QueryHandlerStrict } from 'src/common';
import { GetTopMarginProductsQuery } from './get-top-margin-products.query';
import { ProductMarginRankResponse } from '../../models';

interface RawRow {
  productId: string;
  productName: string;
  totalMargin: string;
  totalRevenue: string;
  avgUnitPrice: string;
}

const SQL = `
  SELECT
    bi.product_id AS "productId",
    p.name AS "productName",
    COALESCE(SUM((bi.unit_price - COALESCE(p.cost_price, 0)) * bi.quantity), 0) AS "totalMargin",
    COALESCE(SUM(bi.line_total), 0) AS "totalRevenue",
    COALESCE(AVG(bi.unit_price), 0) AS "avgUnitPrice"
  FROM core.bill_items bi
  JOIN core.bills b ON b.id = bi.bill_id
  JOIN core.products p ON p.id = bi.product_id
  WHERE b.organization_id = $1
    AND b.status = 'COMPLETED'
    AND b.deleted_at IS NULL
    AND b.created_at >= $2
    AND b.created_at <= $3
    AND ($4::uuid IS NULL OR b.location_id = $4)
  GROUP BY bi.product_id, p.name
  HAVING SUM(bi.line_total) > 0
  ORDER BY SUM((bi.unit_price - COALESCE(p.cost_price, 0)) * bi.quantity) DESC
  LIMIT $5
`;

@QueryHandlerStrict(GetTopMarginProductsQuery)
export class GetTopMarginProductsHandler
  implements IQueryHandler<GetTopMarginProductsQuery, ProductMarginRankResponse[]>
{
  public constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectPinoLogger(GetTopMarginProductsHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: GetTopMarginProductsQuery): Promise<ProductMarginRankResponse[]> {
    this.logger.info(`Executing Query '${GetTopMarginProductsQuery.name}'`);
    const rows = await this.dataSource.query<RawRow[]>(SQL, [
      query.organizationId,
      query.from,
      query.to,
      query.locationId ?? null,
      query.limit,
    ]);
    return rows.map((r) => ({
      productId: r.productId,
      productName: r.productName,
      totalMargin: Number(r.totalMargin),
      totalRevenue: Number(r.totalRevenue),
      avgUnitPrice: Number(r.avgUnitPrice),
    }));
  }
}
