import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailTemplateProfile } from './mapper/email-template.profile';
import { MailController } from './mail.controller';
import { MailOptions } from '../../../common';
import { AppMailService } from '../../../common';
import { ICoreApiConfig } from '../../../configuration';

@Module({
  controllers: [MailController],
  providers:   [
    {
      provide:    MailOptions,
      useFactory: (config: ConfigService<ICoreApiConfig>): MailOptions => {
        const cfg = config.get<ICoreApiConfig['mail']>('mail');
        return new MailOptions(cfg.host, cfg.port, cfg.secure, cfg.user, cfg.password, cfg.from);
      },
      inject: [ConfigService],
    },
    AppMailService,
    EmailTemplateProfile,
  ],
  exports: [EmailTemplateProfile],
})
export class MailTemplatesModule {}
