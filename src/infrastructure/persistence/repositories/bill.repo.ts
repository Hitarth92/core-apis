import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Between, FindManyOptions, Not, Repository } from 'typeorm';
import { BaseRepo, DbException, Filter, PageableFilter } from '../../../common';
import { BillEntity } from '../entities';
import { Bill } from '../../../application/modules/bills/domain';
import { IBillRepo, BillFilter } from '../../../application/modules/bills';

@Injectable()
export class BillRepo
  extends BaseRepo<BillEntity, Bill, string, PageableFilter<BillFilter>, Filter<BillFilter>>
  implements IBillRepo
{
  constructor(
    @InjectRepository(BillEntity) internalRepo: Repository<BillEntity>,
    @InjectMapper() mapper: Mapper,
    @InjectPinoLogger(BillRepo.name) logger: PinoLogger,
  ) {
    super(internalRepo, mapper, logger, BillEntity, Bill);
  }

  public override get idColumnName(): keyof BillEntity {
    return 'id';
  }

  public override get specialFilterFields(): (keyof (PageableFilter<BillFilter>))[] {
    return [...super.specialFilterFields, 'saleTypeNot'] as any;
  }

  public override get softDeleteEnabled(): boolean {
    return true;
  }

  /**
   * A single bill always carries its lines — the POS resume flow and the bill
   * detail screen both read them from here. List/search stay header-only on
   * purpose so pagination isn't paying for a join it doesn't render.
   */
  public override async getAsync(pk: string): Promise<Bill> {
    try {
      const entity = await this.internalRepo.findOne({
        where: { id: pk },
        relations: { items: true },
        order: { items: { createdAt: 'ASC' } },
      });
      return entity ? this.mapToModel(entity) : null;
    } catch (ex) {
      this.logger.error(ex);
      throw new DbException(ex);
    }
  }

  protected override modifyFindOption(
    findOpts: FindManyOptions<BillEntity>,
    filterObj: Filter<BillFilter> | PageableFilter<BillFilter>,
  ): void {
    const f = filterObj as BillFilter & { saleTypeNot?: string };
    if (f?.saleTypeNot) {
      findOpts.where = { ...(findOpts.where as object), saleType: Not(f.saleTypeNot) };
    }
  }

  public async countForDateAsync(date: Date): Promise<number> {
    const yr = date.getUTCFullYear(), mo = date.getUTCMonth(), dy = date.getUTCDate();
    const start = new Date(Date.UTC(yr, mo, dy, 0, 0, 0, 0));
    const end   = new Date(Date.UTC(yr, mo, dy, 23, 59, 59, 999));
    return this.internalRepo.count({ where: { createdAt: Between(start, end) }, withDeleted: true });
  }
}
