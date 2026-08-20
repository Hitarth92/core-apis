import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { QueryHandlerStrict } from 'src/common';
import { GetStockByLocationQuery } from './get-stock-by-location.query';
import { StockByLocationPointResponse } from '../../models';

interface RawStockByLocation {
  locationId: string;
  locationName: string;
  locationType: string;
  totalStock: string;
  productCount: string;
  valuation: string;
}

const STOCK_BY_LOCATION_SQL = `
  SELECT
    l.id AS "locationId",
    l.name AS "locationName",
    l.type AS "locationType",
    COALESCE(SUM(i.quantity_on_hand), 0) AS "totalStock",
    COUNT(DISTINCT i.product_id) AS "productCount",
    COALESCE(SUM(i.quantity_on_hand * COALESCE(i.average_cost, 0)), 0) AS "valuation"
  FROM core.locations l
  LEFT JOIN core.inventory i ON i.location_id = l.id AND i.organization_id = $1
  WHERE l.organization_id = $1 AND l.deleted_at IS NULL
    AND ($2::uuid IS NULL OR l.id = $2)
  GROUP BY l.id, l.name, l.type
  ORDER BY COALESCE(SUM(i.quantity_on_hand * COALESCE(i.average_cost, 0)), 0) DESC
`;

@QueryHandlerStrict(GetStockByLocationQuery)
export class GetStockByLocationHandler implements IQueryHandler<GetStockByLocationQuery, StockByLocationPointResponse[]> {
  public constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectPinoLogger(GetStockByLocationHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: GetStockByLocationQuery): Promise<StockByLocationPointResponse[]> {
    this.logger.info(`Executing Query '${GetStockByLocationQuery.name}'`);
    const rows = await this.dataSource.query<RawStockByLocation[]>(STOCK_BY_LOCATION_SQL, [
      query.organizationId,
      query.locationId ?? null,
    ]);
    return rows.map((row) => ({
      locationId:   row.locationId,
      locationName: row.locationName,
      locationType: row.locationType,
      totalStock:   Number(row.totalStock),
      productCount: Number(row.productCount),
      valuation:    Number(row.valuation),
    }));
  }
}
