import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { QueryHandlerStrict } from 'src/common';
import { GetTopCustomersQuery } from './get-top-customers.query';
import { TopCustomerResponse } from '../../models';

interface RawTopCustomer {
  customerId: string | null;
  customerName: string;
  totalSpend: string;
  billCount: string;
}

const TOP_CUSTOMERS_SQL = `
  SELECT
    b.customer_id AS "customerId",
    COALESCE(c.name, b.walk_in_name, 'Walk-in') AS "customerName",
    COALESCE(SUM(b.total_amount), 0) AS "totalSpend",
    COUNT(b.id) AS "billCount"
  FROM core.bills b
  LEFT JOIN core.customers c ON b.customer_id = c.id
  WHERE b.organization_id = $1
    AND b.status = 'COMPLETED'
    AND b.deleted_at IS NULL
  GROUP BY b.customer_id, COALESCE(c.name, b.walk_in_name, 'Walk-in')
  ORDER BY SUM(b.total_amount) DESC
  LIMIT $2
`;

@QueryHandlerStrict(GetTopCustomersQuery)
export class GetTopCustomersHandler implements IQueryHandler<GetTopCustomersQuery, TopCustomerResponse[]> {
  public constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectPinoLogger(GetTopCustomersHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: GetTopCustomersQuery): Promise<TopCustomerResponse[]> {
    this.logger.info(`Executing Query '${GetTopCustomersQuery.name}'`);
    const rows = await this.dataSource.query<RawTopCustomer[]>(TOP_CUSTOMERS_SQL, [query.organizationId, query.limit]);
    return rows.map(row => ({
      customerId:   row.customerId,
      customerName: row.customerName,
      totalSpend:   Number(row.totalSpend),
      billCount:    Number(row.billCount),
    }));
  }
}
