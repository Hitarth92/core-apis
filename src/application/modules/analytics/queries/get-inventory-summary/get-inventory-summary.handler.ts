import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { QueryHandlerStrict } from 'src/common';
import { GetInventorySummaryQuery } from './get-inventory-summary.query';
import { InventorySummaryResponse } from '../../models';

interface RawInventorySummary {
  totalSkus: string;
  lowStockCount: string;
  zeroStockCount: string;
  totalValuation: string;
}

const INVENTORY_SUMMARY_SQL = `
  SELECT
    COUNT(*) AS "totalSkus",
    COUNT(CASE WHEN quantity_on_hand < reorder_level AND reorder_level > 0 THEN 1 END) AS "lowStockCount",
    COUNT(CASE WHEN quantity_on_hand = 0 THEN 1 END) AS "zeroStockCount",
    COALESCE(SUM(quantity_on_hand * COALESCE(average_cost, 0)), 0) AS "totalValuation"
  FROM core.inventory
  WHERE organization_id = $1
    AND ($2::uuid IS NULL OR location_id = $2)
`;

@QueryHandlerStrict(GetInventorySummaryQuery)
export class GetInventorySummaryHandler implements IQueryHandler<GetInventorySummaryQuery, InventorySummaryResponse> {
  public constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectPinoLogger(GetInventorySummaryHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: GetInventorySummaryQuery): Promise<InventorySummaryResponse> {
    this.logger.info(`Executing Query '${GetInventorySummaryQuery.name}'`);
    const [summary] = await this.dataSource.query<RawInventorySummary[]>(INVENTORY_SUMMARY_SQL, [
      query.organizationId,
      query.locationId ?? null,
    ]);
    return {
      totalSkus: Number(summary.totalSkus),
      lowStockCount: Number(summary.lowStockCount),
      zeroStockCount: Number(summary.zeroStockCount),
      totalValuation: Number(summary.totalValuation),
    };
  }
}
