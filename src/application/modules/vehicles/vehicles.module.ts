import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { VehiclesController } from './vehicles.controller';
import { VehicleCommandHandlers } from './commands';
import { VehicleQueryHandlers } from './queries';
import { VehicleProfile } from './mapper';
import { VehicleFilterNormalizer } from './helpers';
import { VehicleFeatureOptions } from './options';

@Module({
  imports:     [CqrsModule],
  controllers: [VehiclesController],
  providers:   [
    ...VehicleCommandHandlers,
    ...VehicleQueryHandlers,
    VehicleProfile,
    VehicleFilterNormalizer,
    VehicleFeatureOptions,
  ],
})
export class VehiclesModule {}
