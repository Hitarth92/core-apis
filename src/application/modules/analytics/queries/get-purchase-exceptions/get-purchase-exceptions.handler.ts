import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { QueryHandlerStrict } from 'src/common';
import { GetPurchaseExceptionsQuery } from './get-purchase-exceptions.query';
import { PurchaseExceptionsResponse } from '../../models';

interface RawRow {
  pending: string;
  approvalPending: string;
}

interface RawPriceRow {
  priceIncreased: string;
}

const SQL = `
  SELECT
    COUNT(CASE WHEN status IN ('ordered', 'partially_received') THEN 1 END) AS pending,
    COUNT(CASE WHEN status = 'draft' THEN 1 END) AS "approvalPending"
  FROM core.purchase_orders
  WHERE organization_id = $1
    AND ($2::uuid IS NULL OR location_id = $2)
`;

const PRICE_INCREASED_SQL = `
  WITH po_costs AS (
    SELECT
      pi.unit_cost,
      LAG(pi.unit_cost) OVER (
        PARTITION BY pi.product_id, po.supplier_id ORDER BY po.created_at
      ) AS prev_cost
    FROM core.purchase_items pi
    JOIN core.purchase_orders po ON po.id = pi.purchase_order_id
    WHERE po.organization_id = $1
      AND po.status = 'received'
      AND ($2::uuid IS NULL OR po.location_id = $2)
  )
  SELECT COUNT(*) AS "priceIncreased"
  FROM po_costs
  WHERE prev_cost IS NOT NULL AND unit_cost > prev_cost
`;

@QueryHandlerStrict(GetPurchaseExceptionsQuery)
export class GetPurchaseExceptionsHandler
  implements IQueryHandler<GetPurchaseExceptionsQuery, PurchaseExceptionsResponse>
{
  public constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectPinoLogger(GetPurchaseExceptionsHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: GetPurchaseExceptionsQuery): Promise<PurchaseExceptionsResponse> {
    this.logger.info(`Executing Query '${GetPurchaseExceptionsQuery.name}'`);
    const [[row], [priceRow]] = await Promise.all([
      this.dataSource.query<RawRow[]>(SQL, [query.organizationId, query.locationId ?? null]),
      this.dataSource.query<RawPriceRow[]>(PRICE_INCREASED_SQL, [query.organizationId, query.locationId ?? null]),
    ]);
    return {
      pending: Number(row?.pending ?? 0),
      approvalPending: Number(row?.approvalPending ?? 0),
      priceIncreased: Number(priceRow?.priceIncreased ?? 0),
    };
  }
}
