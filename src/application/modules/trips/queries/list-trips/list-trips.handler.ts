import { Inject } from '@nestjs/common';
import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { QueryHandlerStrict, IFilterNormalizer } from 'src/common';
import { TRIP_REPO } from 'src/application/constants';
import { ITripRepo } from '../../repositories/i-trip.repo';
import { Trip, TripFilter } from '../../domain';
import { TripFilterNormalizer } from '../../helpers'
import { ListTripsQuery } from './list-trips.query';

@QueryHandlerStrict(ListTripsQuery)
export class ListTripsHandler implements IQueryHandler<ListTripsQuery, Trip[]> {
  constructor(
    @Inject(TRIP_REPO) protected readonly repo: ITripRepo,
    @Inject(TripFilterNormalizer) protected readonly filterNormalizer: IFilterNormalizer<TripFilter>,
    @InjectPinoLogger(ListTripsHandler.name) protected readonly logger: PinoLogger,
  ) {}

  public async execute(query: ListTripsQuery): Promise<Trip[]> {
    this.logger.info(`Executing Query "${ListTripsQuery.name}"`);
    const filter = this.filterNormalizer.normalize(query);
    return this.repo.allAsync(filter as any);
  }
}
