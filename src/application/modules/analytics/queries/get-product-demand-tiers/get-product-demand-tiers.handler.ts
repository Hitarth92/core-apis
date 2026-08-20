import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { QueryHandlerStrict } from 'src/common';
import { GetProductDemandTiersQuery } from './get-product-demand-tiers.query';
import { DemandTierPointResponse } from '../../models';

interface RawRow {
  tier: string;
  count: string;
}

const SQL = `
  WITH sold AS (
    SELECT bi.product_id, SUM(bi.quantity) AS qty
    FROM core.bill_items bi
    JOIN core.bills b ON b.id = bi.bill_id
    WHERE b.organization_id = $1
      AND b.status = 'COMPLETED'
      AND b.deleted_at IS NULL
      AND b.created_at >= $2
      AND b.created_at <= $3
      AND ($4::uuid IS NULL OR b.location_id = $4)
    GROUP BY bi.product_id
    HAVING SUM(bi.quantity) > 0
  ),
  ranked AS (
    SELECT qty, NTILE(3) OVER (ORDER BY qty DESC) AS tier_num
    FROM sold
  )
  SELECT
    CASE tier_num WHEN 1 THEN 'High' WHEN 2 THEN 'Medium' ELSE 'Low' END AS tier,
    COUNT(*)::text AS count
  FROM ranked
  GROUP BY tier_num
  ORDER BY tier_num
`;

@QueryHandlerStrict(GetProductDemandTiersQuery)
export class GetProductDemandTiersHandler
  implements IQueryHandler<GetProductDemandTiersQuery, DemandTierPointResponse[]>
{
  public constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectPinoLogger(GetProductDemandTiersHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: GetProductDemandTiersQuery): Promise<DemandTierPointResponse[]> {
    this.logger.info(`Executing Query '${GetProductDemandTiersQuery.name}'`);
    const rows = await this.dataSource.query<RawRow[]>(SQL, [
      query.organizationId,
      query.from,
      query.to,
      query.locationId ?? null,
    ]);
    return rows.map((r) => ({ tier: r.tier, count: Number(r.count) }));
  }
}
