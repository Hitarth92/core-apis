import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { OrdersController } from './orders.controller';
import { OrderCommandHandlers } from './commands';
import { OrderQueryHandlers } from './queries';
import { OrderProfile } from './mapper';
import { MailOptions } from '../../../common';
import { ICoreApiConfig } from '../../../configuration';
import { OrdersMailService } from './mail';

@Module({
  imports:     [CqrsModule],
  controllers: [OrdersController],
  providers:   [
    {
      provide:    MailOptions,
      useFactory: (config: ConfigService<ICoreApiConfig>): MailOptions => {
        const cfg = config.get<ICoreApiConfig['mail']>('mail');
        return new MailOptions(cfg.host, cfg.port, cfg.secure, cfg.user, cfg.password, cfg.from);
      },
      inject: [ConfigService],
    },
    OrdersMailService,
    ...OrderCommandHandlers,
    ...OrderQueryHandlers,
    OrderProfile,
  ],
})
export class OrdersModule {}
