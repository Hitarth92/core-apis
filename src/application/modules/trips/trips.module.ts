import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TripsController } from './trips.controller';
import { TripCommandHandlers } from './commands';
import { TripQueryHandlers } from './queries';
import { TripProfile } from './mapper';
import { TripFilterNormalizer } from './helpers';
import { TripFeatureOptions } from './options';

@Module({
  imports:     [CqrsModule],
  controllers: [TripsController],
  providers:   [
    ...TripCommandHandlers,
    ...TripQueryHandlers,
    TripProfile,
    TripFilterNormalizer,
    TripFeatureOptions,
  ],
})
export class TripsModule {}
