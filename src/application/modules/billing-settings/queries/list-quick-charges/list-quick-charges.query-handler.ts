import { Inject } from '@nestjs/common';
import { IQueryHandler } from '@nestjs/cqrs';
import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { QueryHandlerStrict } from '../../../../../common';
import { QUICK_CHARGE_REPO } from '../../../../constants';
import { QuickCharge } from '../../domain';
import { IQuickChargeRepo } from '../../i-quick-charge.repo';
import { QuickChargeResponse } from '../../models';
import { ListQuickChargesQuery } from './list-quick-charges.query';

@QueryHandlerStrict(ListQuickChargesQuery)
export class ListQuickChargesQueryHandler implements IQueryHandler<ListQuickChargesQuery, QuickChargeResponse[]> {
  constructor(
    @Inject(QUICK_CHARGE_REPO) private readonly repo: IQuickChargeRepo,
    @InjectMapper() private readonly mapper: Mapper,
    @InjectPinoLogger(ListQuickChargesQueryHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: ListQuickChargesQuery): Promise<QuickChargeResponse[]> {
    this.logger.info(`Executing ${ListQuickChargesQuery.name}`);
    const filter: { organizationId: string; enabled?: boolean } = { organizationId: query.organizationId };
    if (query.enabled !== undefined) filter.enabled = query.enabled;
    const charges = await this.repo.allAsync(filter);
    charges.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
    return this.mapper.mapArray(charges, QuickCharge, QuickChargeResponse);
  }
}
