import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { QueryHandlerStrict } from 'src/common';
import { GetFastMovingProductsQuery } from './get-fast-moving-products.query';
import { ProductMovementRankResponse } from '../../models';

interface RawRow {
  productId: string;
  productName: string;
  quantity: string;
  value: string;
}

const SQL = `
  SELECT
    bi.product_id AS "productId",
    p.name AS "productName",
    COALESCE(SUM(bi.quantity), 0) AS quantity,
    COALESCE(SUM(bi.line_total), 0) AS value
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
  ORDER BY SUM(bi.quantity) DESC
  LIMIT $5
`;

@QueryHandlerStrict(GetFastMovingProductsQuery)
export class GetFastMovingProductsHandler
  implements IQueryHandler<GetFastMovingProductsQuery, ProductMovementRankResponse[]>
{
  public constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectPinoLogger(GetFastMovingProductsHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: GetFastMovingProductsQuery): Promise<ProductMovementRankResponse[]> {
    this.logger.info(`Executing Query '${GetFastMovingProductsQuery.name}'`);
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
      quantity: Number(r.quantity),
      value: Number(r.value),
    }));
  }
}
