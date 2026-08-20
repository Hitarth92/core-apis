import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { BaseRepo, Filter, PageableFilter } from '../../../common';
import { QuickChargeEntity } from '../entities';
import { QuickCharge } from '../../../application/modules/billing-settings/domain';
import { IQuickChargeRepo, QuickChargeFilter } from '../../../application/modules/billing-settings';

@Injectable()
export class QuickChargeRepo extends BaseRepo<QuickChargeEntity, QuickCharge, string, PageableFilter<QuickChargeFilter>, Filter<QuickChargeFilter>> implements IQuickChargeRepo {
  constructor(
    @InjectRepository(QuickChargeEntity) internalRepo: Repository<QuickChargeEntity>,
    @InjectMapper() mapper: Mapper,
    @InjectPinoLogger(QuickChargeRepo.name) logger: PinoLogger,
  ) {
    super(internalRepo, mapper, logger, QuickChargeEntity, QuickCharge);
  }

  public override get idColumnName(): keyof QuickChargeEntity {
    return 'id';
  }
}
