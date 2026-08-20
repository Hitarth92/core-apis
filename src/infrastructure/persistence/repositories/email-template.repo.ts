import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { BaseRepo, Filter, PageableFilter } from '../../../common';
import { EmailTemplateEntity } from '../entities';
import { EmailTemplate, IEmailTemplateRepo } from '../../../common';

@Injectable()
export class EmailTemplateRepo
  extends BaseRepo<
    EmailTemplateEntity,
    EmailTemplate,
    string,
    PageableFilter<Record<string, unknown>>,
    Filter<Record<string, unknown>>
  >
  implements IEmailTemplateRepo
{
  constructor(
    @InjectRepository(EmailTemplateEntity) internalRepo: Repository<EmailTemplateEntity>,
    @InjectMapper() mapper: Mapper,
    @InjectPinoLogger(EmailTemplateRepo.name) logger: PinoLogger,
  ) {
    super(internalRepo, mapper, logger, EmailTemplateEntity, EmailTemplate);
  }

  public override get idColumnName(): keyof EmailTemplateEntity {
    return 'id';
  }

  public async findBySlugAsync(slug: string): Promise<EmailTemplate | null> {
    const entity = await this.internalRepo.findOne({ where: { slug, isActive: true } });
    if (!entity) return null;
    return this.mapper.map(entity, EmailTemplateEntity, EmailTemplate);
  }
}
