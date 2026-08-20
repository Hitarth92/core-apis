import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { QueryHandlerStrict } from 'src/common';
import { GetDeadStockQuery } from './get-dead-stock.query';
import { ProductMovementRankResponse } from '../../models';

interface RawRow {
  productId: string;
  productName: string;
  quantity: string;
  value: string;
}

@QueryHandlerStrict(GetDeadStockQuery)
export class GetDeadStockHandler implements IQueryHandler<GetDeadStockQuery, ProductMovementRankResponse[]> {
  public constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectPinoLogger(GetDeadStockHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: GetDeadStockQuery): Promise<ProductMovementRankResponse[]> {
    this.logger.info(`Executing Query '${GetDeadStockQuery.name}'`);

    const sql = `
      SELECT
        p.id AS "productId",
        p.name AS "productName",
        COALESCE(SUM(i.quantity_on_hand), 0) AS quantity,
        COALESCE(SUM(i.quantity_on_hand * COALESCE(i.average_cost, 0)), 0) AS value
      FROM core.inventory i
      JOIN core.products p ON p.id = i.product_id
      WHERE i.organization_id = $1
        AND ($2::uuid IS NULL OR i.location_id = $2)
        AND i.quantity_on_hand > 0
        AND NOT EXISTS (
          SELECT 1
          FROM core.bill_items bi
          JOIN core.bills b ON b.id = bi.bill_id
          WHERE bi.product_id = i.product_id
            AND b.organization_id = $1
            AND b.status = 'COMPLETED'
            AND b.deleted_at IS NULL
            AND b.created_at >= NOW() - ($3 || ' days')::interval
            AND ($2::uuid IS NULL OR b.location_id = $2)
        )
      GROUP BY p.id, p.name
      ORDER BY value DESC
      LIMIT $4
    `;

    const rows = await this.dataSource.query<RawRow[]>(sql, [
      query.organizationId,
      query.locationId ?? null,
      String(query.staleDays),
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
