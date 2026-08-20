import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BillingSettingsController } from './billing-settings.controller';
import { BillingSettingsCommandHandlers } from './commands';
import { BillingSettingsQueryHandlers } from './queries';
import { BillingSettingsProfile } from './mapper';

@Module({
  imports:     [CqrsModule],
  controllers: [BillingSettingsController],
  providers:   [
    ...BillingSettingsCommandHandlers,
    ...BillingSettingsQueryHandlers,
    BillingSettingsProfile,
  ],
})
export class BillingSettingsModule {}
