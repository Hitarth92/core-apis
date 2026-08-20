import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { QueryHandlerStrict } from 'src/common';
import { GetStockValueByCategoryQuery } from './get-stock-value-by-category.query';
import { CategoryValuePointResponse } from '../../models';

interface RawRow {
  categoryId: string | null;
  categoryName: string;
  value: string;
}

const SQL = `
  SELECT
    c.id AS "categoryId",
    COALESCE(c.name, 'Uncategorized') AS "categoryName",
    COALESCE(SUM(i.quantity_on_hand * COALESCE(i.average_cost, 0)), 0) AS value
  FROM core.inventory i
  JOIN core.products p ON p.id = i.product_id
  LEFT JOIN core.categories c ON c.id = p.category_id
  WHERE i.organization_id = $1
    AND ($2::uuid IS NULL OR i.location_id = $2)
  GROUP BY c.id, c.name
  HAVING COALESCE(SUM(i.quantity_on_hand * COALESCE(i.average_cost, 0)), 0) > 0
  ORDER BY value DESC
`;

@QueryHandlerStrict(GetStockValueByCategoryQuery)
export class GetStockValueByCategoryHandler
  implements IQueryHandler<GetStockValueByCategoryQuery, CategoryValuePointResponse[]>
{
  public constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectPinoLogger(GetStockValueByCategoryHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: GetStockValueByCategoryQuery): Promise<CategoryValuePointResponse[]> {
    this.logger.info(`Executing Query '${GetStockValueByCategoryQuery.name}'`);
    const rows = await this.dataSource.query<RawRow[]>(SQL, [
      query.organizationId,
      query.locationId ?? null,
    ]);
    return rows.map((row) => ({
      categoryId: row.categoryId ?? undefined,
      categoryName: row.categoryName,
      value: Number(row.value),
    }));
  }
}
