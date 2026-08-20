import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { FindOptionsWhere, Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { BaseSeed } from '../../../common';
import { PurchaseOrderEntity } from '../entities';
import { EPurchaseOrderStatus } from '../../../application/shared/enums';

@Injectable()
export class PurchaseOrdersSeed extends BaseSeed<PurchaseOrderEntity> {
  public get version(): number { return 1; }
    public get seedingData(): Partial<PurchaseOrderEntity>[] {
    return [
      {
        poNumber: 'PO-2026-00001',
        organizationId: '00000000-0000-4000-8000-000000000001',
        supplierId: '00000000-0000-4000-8000-000000000004',
        locationId: '00000000-0000-4000-8000-000000000002',
        status: EPurchaseOrderStatus.Received,
        totalAmount: 150000.00,
      }
    ];
  }

  constructor(
    dataSource: DataSource,
    @InjectRepository(PurchaseOrderEntity) repo: Repository<PurchaseOrderEntity>,
    @InjectPinoLogger(PurchaseOrdersSeed.name) logger: PinoLogger,
  ) {
    super(dataSource, repo, logger);
  }

  protected equalityCheck(x: Partial<PurchaseOrderEntity>, y: Partial<PurchaseOrderEntity>): boolean {
    return x.poNumber === y.poNumber;
  }

  protected createFilter(): FindOptionsWhere<PurchaseOrderEntity> { return {}; }
}
