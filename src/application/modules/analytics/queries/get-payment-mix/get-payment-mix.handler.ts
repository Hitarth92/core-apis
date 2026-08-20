import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { QueryHandlerStrict } from 'src/common';
import { GetPaymentMixQuery } from './get-payment-mix.query';
import { PaymentMixPointResponse } from '../../models';

interface RawRow {
  method: string;
  amount: string;
}

const SQL = `
  SELECT
    CASE
      WHEN LOWER(COALESCE(payment_method::text, '')) = 'cash' THEN 'Cash'
      WHEN LOWER(COALESCE(payment_method::text, '')) = 'credit' THEN 'Credit'
      WHEN LOWER(COALESCE(payment_method::text, '')) IN ('net_banking', 'card', 'cheque') THEN 'Bank'
      WHEN LOWER(COALESCE(payment_method::text, '')) = 'upi' THEN 'M-Pesa'
      ELSE 'Other'
    END AS method,
    COALESCE(SUM(total_amount), 0) AS amount
  FROM core.bills
  WHERE organization_id = $1
    AND status = 'COMPLETED'
    AND deleted_at IS NULL
    AND created_at >= $2
    AND created_at <= $3
    AND ($4::uuid IS NULL OR location_id = $4)
  GROUP BY 1
  HAVING COALESCE(SUM(total_amount), 0) > 0
  ORDER BY amount DESC
`;

@QueryHandlerStrict(GetPaymentMixQuery)
export class GetPaymentMixHandler implements IQueryHandler<GetPaymentMixQuery, PaymentMixPointResponse[]> {
  public constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectPinoLogger(GetPaymentMixHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: GetPaymentMixQuery): Promise<PaymentMixPointResponse[]> {
    this.logger.info(`Executing Query '${GetPaymentMixQuery.name}'`);
    const rows = await this.dataSource.query<RawRow[]>(SQL, [
      query.organizationId,
      query.from,
      query.to,
      query.locationId ?? null,
    ]);
    return rows.map((row) => ({
      method: row.method,
      amount: Number(row.amount),
    }));
  }
}
