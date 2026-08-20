import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { SharedModule } from '../../shared';
import { BillsController } from './bills.controller';
import { BillCommandHandlers } from './commands';
import { BillQueryHandlers } from './queries';
import { BillProfile } from './mapper/bill.profile';
import { BillFeatureOptions } from './options';
import { BillFilterNormalizer } from './helpers';
import { MailOptions } from '../../../common';
import { ICoreApiConfig } from '../../../configuration';
import { BillsMailService } from './mail';

@Module({
  imports: [CqrsModule, SharedModule],
  controllers: [BillsController],
  providers:   [
    {
      provide:    MailOptions,
      useFactory: (config: ConfigService<ICoreApiConfig>): MailOptions => {
        const cfg = config.get<ICoreApiConfig['mail']>('mail');
        return new MailOptions(cfg.host, cfg.port, cfg.secure, cfg.user, cfg.password, cfg.from);
      },
      inject: [ConfigService],
    },
    BillsMailService,
    ...BillCommandHandlers,
    ...BillQueryHandlers,
    BillProfile,
    BillFeatureOptions,
    BillFilterNormalizer,
  ],
})
export class BillsModule {}
