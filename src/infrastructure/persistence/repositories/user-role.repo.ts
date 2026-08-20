import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { BaseRepo, Filter, PageableFilter } from '../../../common';
import { UserRoleEntity } from '../entities';
import { UserRole } from '../../../application/modules/user-roles/domain';
import { IUserRoleRepo, UserRoleFilter } from '../../../application/modules/user-roles';

@Injectable()
export class UserRoleRepo extends BaseRepo<UserRoleEntity, UserRole, string, PageableFilter<UserRoleFilter>, Filter<UserRoleFilter>> implements IUserRoleRepo {
  constructor(
    @InjectRepository(UserRoleEntity) internalRepo: Repository<UserRoleEntity>,
    @InjectMapper() mapper: Mapper,
    @InjectPinoLogger(UserRoleRepo.name) logger: PinoLogger,
  ) {
    super(internalRepo, mapper, logger, UserRoleEntity, UserRole);
  }

  public override get idColumnName(): keyof UserRoleEntity {
    return 'id';
  }

  public async allByOrganizationAsync(organizationId: string): Promise<UserRole[]> {
    const entities = await this.internalRepo
      .createQueryBuilder('ur')
      .innerJoin('ur.user', 'u')
      .where('u.organizationId = :organizationId', { organizationId })
      .getMany();
    return this.mapper.mapArray(entities, UserRoleEntity, UserRole);
  }
}
