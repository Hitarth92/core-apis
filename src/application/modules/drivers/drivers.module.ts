import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DriversController } from './drivers.controller';
import { DriverCommandHandlers } from './commands';
import { DriverQueryHandlers } from './queries';
import { DriverProfile } from './mapper';
import { DriverFilterNormalizer } from './helpers';
import { DriverFeatureOptions } from './options';

@Module({
  imports:     [CqrsModule],
  controllers: [DriversController],
  providers:   [
    ...DriverCommandHandlers,
    ...DriverQueryHandlers,
    DriverProfile,
    DriverFilterNormalizer,
    DriverFeatureOptions,
  ],
})
export class DriversModule {}
