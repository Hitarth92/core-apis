import { Inject } from '@nestjs/common';
import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { QueryHandlerStrict, IFilterNormalizer, IPageable } from 'src/common';
import { TRIP_REPO } from 'src/application/constants';
import { ITripRepo } from '../../repositories/i-trip.repo';
import { Trip, TripFilter } from '../../domain';
import { TripFilterNormalizer } from '../../helpers';
import { SearchTripsQuery } from './search-trips.query';

@QueryHandlerStrict(SearchTripsQuery)
export class SearchTripsHandler implements IQueryHandler<SearchTripsQuery, IPageable<Trip>> {
  @Inject(TRIP_REPO) protected readonly repo: ITripRepo;
  @Inject(TripFilterNormalizer) protected readonly filterNormalizer: IFilterNormalizer<TripFilter>;
  @InjectPinoLogger(SearchTripsHandler.name) protected readonly logger: PinoLogger;

  public async execute(query: SearchTripsQuery): Promise<IPageable<Trip>> {
    this.logger.info(`Executing Query "${SearchTripsQuery.name}"`);
    const filter = this.filterNormalizer.pageableNormalize(query);
    return this.repo.pagedAsync(filter as any);
  }
}
