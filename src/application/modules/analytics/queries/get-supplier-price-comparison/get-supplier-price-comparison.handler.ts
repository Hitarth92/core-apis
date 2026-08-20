import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { QueryHandlerStrict } from 'src/common';
import { GetSupplierPriceComparisonQuery } from './get-supplier-price-comparison.query';
import { SupplierPricePointResponse } from '../../models';

interface RawRow {
  productId: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  avgUnitCost: string;
}

const SQL = `
  WITH product_suppliers AS (
    SELECT
      pi.product_id,
      po.supplier_id,
      AVG(pi.unit_cost) AS avg_cost,
      SUM(pi.total_cost) AS total_spend
    FROM core.purchase_items pi
    JOIN core.purchase_orders po ON po.id = pi.purchase_order_id
    WHERE po.organization_id = $1
      AND po.status = 'received'
      AND po.created_at >= $2
      AND po.created_at <= $3
      AND ($4::uuid IS NULL OR po.location_id = $4)
    GROUP BY pi.product_id, po.supplier_id
  ),
  multi_supplier_products AS (
    SELECT product_id
    FROM product_suppliers
    GROUP BY product_id
    HAVING COUNT(DISTINCT supplier_id) >= 2
  )
  SELECT
    p.id AS "productId",
    p.name AS "productName",
    s.id AS "supplierId",
    s.name AS "supplierName",
    ps.avg_cost AS "avgUnitCost"
  FROM product_suppliers ps
  JOIN multi_supplier_products msp ON msp.product_id = ps.product_id
  JOIN core.products p ON p.id = ps.product_id
  JOIN core.suppliers s ON s.id = ps.supplier_id
  ORDER BY (
    SELECT SUM(total_spend) FROM product_suppliers ps2 WHERE ps2.product_id = ps.product_id
  ) DESC, p.name, ps.avg_cost
  LIMIT $5
`;

@QueryHandlerStrict(GetSupplierPriceComparisonQuery)
export class GetSupplierPriceComparisonHandler
  implements IQueryHandler<GetSupplierPriceComparisonQuery, SupplierPricePointResponse[]>
{
  public constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectPinoLogger(GetSupplierPriceComparisonHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: GetSupplierPriceComparisonQuery): Promise<SupplierPricePointResponse[]> {
    this.logger.info(`Executing Query '${GetSupplierPriceComparisonQuery.name}'`);
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
      supplierId: r.supplierId,
      supplierName: r.supplierName,
      avgUnitCost: Number(r.avgUnitCost),
    }));
  }
}
