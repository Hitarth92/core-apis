import { Inject, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { MailService, EmailTemplateData, MailOptions, EMAIL_TEMPLATE_REPO, IEmailTemplateRepo } from '../../../../common';

@Injectable()
export class BillsMailService extends MailService {
  constructor(
    options: MailOptions,
    @Inject(EMAIL_TEMPLATE_REPO) private readonly templateRepo: IEmailTemplateRepo,
    @InjectPinoLogger(BillsMailService.name) logger: PinoLogger,
  ) {
    super(options, logger);
  }

  protected async findTemplateAsync(slug: string): Promise<EmailTemplateData | null> {
    const template = await this.templateRepo.findBySlugAsync(slug);
    if (!template) return null;
    return { subject: template.subject, htmlBody: template.htmlBody };
  }
}
