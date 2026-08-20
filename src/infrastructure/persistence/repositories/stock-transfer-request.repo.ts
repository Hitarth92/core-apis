import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { BaseRepo, Filter, PageableFilter } from '../../../common';
import { StockTransferRequestEntity } from '../entities';
import { StockTransferRequest } from '../../../application/modules/stock-transfers/domain';
import { EStockTransferRequestStatus } from '../../../application/shared/enums/e-stock-transfer-request-status';
import {
  IStockTransferRequestRepo,
  StockTransferRequestFilter,
} from '../../../application/modules/stock-transfers/i-stock-transfer-request.repo';

@Injectable()
export class StockTransferRequestRepo
  extends BaseRepo<StockTransferRequestEntity, StockTransferRequest, string, PageableFilter<StockTransferRequestFilter>, Filter<StockTransferRequestFilter>>
  implements IStockTransferRequestRepo
{
  constructor(
    @InjectRepository(StockTransferRequestEntity) internalRepo: Repository<StockTransferRequestEntity>,
    @InjectMapper() mapper: Mapper,
    @InjectPinoLogger(StockTransferRequestRepo.name) logger: PinoLogger,
  ) {
    super(internalRepo, mapper, logger, StockTransferRequestEntity, StockTransferRequest);
  }

  public override get idColumnName(): keyof StockTransferRequestEntity {
    return 'id';
  }

  public async findAllOpenForOrgAsync(organizationId: string, excludeLocationId: string): Promise<StockTransferRequest[]> {
    const entities = await this.internalRepo.find({
      where: { organizationId, status: EStockTransferRequestStatus.Open },
    });
    const filtered = entities.filter((entity) => entity.requestingLocationId !== excludeLocationId);
    return filtered.map((entity) => this.mapToModel(entity));
  }

  public async findAllForLocationAsync(organizationId: string, locationId: string): Promise<StockTransferRequest[]> {
    const entities = await this.internalRepo.find({
      where: { organizationId, requestingLocationId: locationId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((entity) => this.mapToModel(entity));
  }

  public async findUsersForLocationAsync(organizationId: string, locationId: string): Promise<string[]> {
    const rows = await this.internalRepo.manager
      .createQueryBuilder()
      .select('DISTINCT ur.user_id', 'userId')
      .from('core.user_roles', 'ur')
      .innerJoin('core.users', 'u', 'u.id = ur.user_id AND u.organization_id = :organizationId', { organizationId })
      .where('ur.store_id = :locationId', { locationId })
      .getRawMany<{ userId: string }>();
    return rows.map((row) => row.userId);
  }

  public async findAllUserIdsInOrgAsync(organizationId: string): Promise<string[]> {
    const rows = await this.internalRepo.manager
      .createQueryBuilder()
      .select('u.id', 'userId')
      .from('core.users', 'u')
      .where('u.organization_id = :organizationId AND u.is_active = true', { organizationId })
      .getRawMany<{ userId: string }>();
    return rows.map((row) => row.userId);
  }
}
