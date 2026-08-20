import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { QueryHandlerStrict } from 'src/common';
import { GetInventoryStatusQuery } from './get-inventory-status.query';
import { InventoryStatusResponse } from '../../models';

interface RawRow {
  normal: string;
  low: string;
  out: string;
  over: string;
  dead: string;
}

@QueryHandlerStrict(GetInventoryStatusQuery)
export class GetInventoryStatusHandler implements IQueryHandler<GetInventoryStatusQuery, InventoryStatusResponse> {
  public constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectPinoLogger(GetInventoryStatusHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: GetInventoryStatusQuery): Promise<InventoryStatusResponse> {
    this.logger.info(`Executing Query '${GetInventoryStatusQuery.name}'`);

    const sql = `
      WITH rows AS (
        SELECT
          i.product_id,
          i.quantity_on_hand,
          i.reorder_level,
          i.max_stock,
          CASE
            WHEN i.quantity_on_hand = 0 THEN 'out'
            WHEN i.reorder_level > 0 AND i.quantity_on_hand < i.reorder_level THEN 'low'
            WHEN i.max_stock IS NOT NULL AND i.max_stock > 0 AND i.quantity_on_hand > i.max_stock THEN 'over'
            WHEN i.quantity_on_hand > 0 AND NOT EXISTS (
              SELECT 1 FROM core.bill_items bi
              JOIN core.bills b ON b.id = bi.bill_id
              WHERE bi.product_id = i.product_id
                AND b.organization_id = $1
                AND b.status = 'COMPLETED'
                AND b.deleted_at IS NULL
                AND b.created_at >= NOW() - ($3 || ' days')::interval
                AND ($2::uuid IS NULL OR b.location_id = $2)
            ) THEN 'dead'
            ELSE 'normal'
          END AS status
        FROM core.inventory i
        WHERE i.organization_id = $1
          AND ($2::uuid IS NULL OR i.location_id = $2)
      )
      SELECT
        COUNT(CASE WHEN status = 'normal' THEN 1 END) AS normal,
        COUNT(CASE WHEN status = 'low' THEN 1 END) AS low,
        COUNT(CASE WHEN status = 'out' THEN 1 END) AS out,
        COUNT(CASE WHEN status = 'over' THEN 1 END) AS over,
        COUNT(CASE WHEN status = 'dead' THEN 1 END) AS dead
      FROM rows
    `;

    const [row] = await this.dataSource.query<RawRow[]>(sql, [
      query.organizationId,
      query.locationId ?? null,
      String(query.staleDays),
    ]);

    return {
      normal: Number(row?.normal ?? 0),
      low: Number(row?.low ?? 0),
      out: Number(row?.out ?? 0),
      over: Number(row?.over ?? 0),
      dead: Number(row?.dead ?? 0),
    };
  }
}
