import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { BaseRepo, Filter, PageableFilter } from '../../../common';
import { OrgMemberEntity } from '../entities';
import { OrgMember, OrgMemberFilter, IOrgMemberRepo } from '../../../application/modules/auth';

@Injectable()
export class OrgMemberRepo
  extends BaseRepo<OrgMemberEntity, OrgMember, string, PageableFilter<OrgMemberFilter>, Filter<OrgMemberFilter>>
  implements IOrgMemberRepo
{
  constructor(
    @InjectRepository(OrgMemberEntity) internalRepo: Repository<OrgMemberEntity>,
    @InjectMapper() mapper: Mapper,
    @InjectPinoLogger(OrgMemberRepo.name) logger: PinoLogger,
  ) {
    super(internalRepo, mapper, logger, OrgMemberEntity, OrgMember);
  }

  public override get idColumnName(): keyof OrgMemberEntity {
    return 'id';
  }

  public async findByUserAndOrgAsync(userId: string, organizationId: string): Promise<OrgMember | null> {
    const entity = await this.internalRepo.findOne({
      where: { userId, organizationId },
    });
    if (!entity) return null;
    return this.mapToModel(entity);
  }

  public async findByUserIdAsync(userId: string): Promise<OrgMember[]> {
    const entities = await this.internalRepo.find({ where: { userId } });
    return this.mapToModelArray(entities);
  }

  public async roleNamesByUserIdsAsync(userIds: string[]): Promise<Array<{ userId: string; roleName: string }>> {
    if (!userIds.length) return [];
    return this.internalRepo
      .createQueryBuilder('om')
      .innerJoin('om.role', 'role')
      .select('om.userId', 'userId')
      .addSelect('role.name', 'roleName')
      .where('om.userId IN (:...userIds)', { userIds })
      .getRawMany<{ userId: string; roleName: string }>();
  }
}
