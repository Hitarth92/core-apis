import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { QueryHandlerStrict } from 'src/common';
import { GetTopSuppliersQuery } from './get-top-suppliers.query';
import { TopSupplierResponse } from '../../models';

interface RawTopSupplier {
  supplierId: string;
  supplierName: string;
  totalSpend: string;
  poCount: string;
}

const TOP_SUPPLIERS_SQL = `
  SELECT
    po.supplier_id AS "supplierId",
    s.name AS "supplierName",
    COALESCE(SUM(po.total_amount), 0) AS "totalSpend",
    COUNT(po.id) AS "poCount"
  FROM core.purchase_orders po
  JOIN core.suppliers s ON po.supplier_id = s.id
  WHERE po.organization_id = $1
    AND po.status = 'received'
  GROUP BY po.supplier_id, s.name
  ORDER BY SUM(po.total_amount) DESC
  LIMIT $2
`;

@QueryHandlerStrict(GetTopSuppliersQuery)
export class GetTopSuppliersHandler implements IQueryHandler<GetTopSuppliersQuery, TopSupplierResponse[]> {
  public constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectPinoLogger(GetTopSuppliersHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: GetTopSuppliersQuery): Promise<TopSupplierResponse[]> {
    this.logger.info(`Executing Query '${GetTopSuppliersQuery.name}'`);
    const rows = await this.dataSource.query<RawTopSupplier[]>(TOP_SUPPLIERS_SQL, [query.organizationId, query.limit]);
    return rows.map(row => ({
      supplierId:   row.supplierId,
      supplierName: row.supplierName,
      totalSpend:   Number(row.totalSpend),
      poCount:      Number(row.poCount),
    }));
  }
}
