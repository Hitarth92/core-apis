import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { FindManyOptions, ILike, In, Repository } from 'typeorm';
import { BaseRepo, Filter, PageableFilter } from '../../../common';
import { StockTransferEntity } from '../entities';
import { StockTransfer } from '../../../application/modules/stock-transfers/domain';
import { IStockTransferRepo, StockTransferFilter } from '../../../application/modules/stock-transfers';

@Injectable()
export class StockTransferRepo extends BaseRepo<StockTransferEntity, StockTransfer, string, PageableFilter<StockTransferFilter>, Filter<StockTransferFilter>> implements IStockTransferRepo {
  constructor(
    @InjectRepository(StockTransferEntity) internalRepo: Repository<StockTransferEntity>,
    @InjectMapper() mapper: Mapper,
    @InjectPinoLogger(StockTransferRepo.name) logger: PinoLogger,
  ) {
    super(internalRepo, mapper, logger, StockTransferEntity, StockTransfer);
  }

  public override get idColumnName(): keyof StockTransferEntity {
    return 'id';
  }

  public override get softDeleteEnabled(): boolean {
    return true;
  }

  public override get specialFilterFields(): (keyof PageableFilter<StockTransferFilter>)[] {
    return [...super.specialFilterFields, 'search', 'accessibleLocationIds'];
  }

  protected override modifyFindOption(
    findOpts: FindManyOptions<StockTransferEntity>,
    filterObj: Filter<StockTransferFilter> | PageableFilter<StockTransferFilter>,
  ): void {
    const filter = filterObj as StockTransferFilter;
    const baseWhere = { ...(findOpts.where as Record<string, unknown>) };

    if (filter.search) {
      baseWhere.transferNumber = ILike(`%${filter.search}%`);
    }

    if (filter.accessibleLocationIds?.length && !baseWhere.fromLocationId && !baseWhere.toLocationId) {
      findOpts.where = [
        {
          organizationId: baseWhere.organizationId as string,
          ...(baseWhere.status ? { status: baseWhere.status as string } : {}),
          ...(baseWhere.transferNumber ? { transferNumber: baseWhere.transferNumber as never } : {}),
          fromLocationId: In(filter.accessibleLocationIds),
        },
        {
          organizationId: baseWhere.organizationId as string,
          ...(baseWhere.status ? { status: baseWhere.status as string } : {}),
          ...(baseWhere.transferNumber ? { transferNumber: baseWhere.transferNumber as never } : {}),
          toLocationId: In(filter.accessibleLocationIds),
        },
      ];
      return;
    }

    findOpts.where = baseWhere;
  }
}
