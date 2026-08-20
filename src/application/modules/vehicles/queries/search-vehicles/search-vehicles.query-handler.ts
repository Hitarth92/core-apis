import { Inject } from '@nestjs/common';
import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { QueryHandlerStrict, IFilterNormalizer, IPageable } from 'src/common';
import { VEHICLE_REPO } from 'src/application/constants';
import { IVehicleRepo } from '../../repositories/i-vehicle.repo';
import { Vehicle, VehicleFilter } from '../../domain';
import { VehicleFilterNormalizer } from '../../helpers';
import { SearchVehiclesQuery } from './search-vehicles.query';

@QueryHandlerStrict(SearchVehiclesQuery)
export class SearchVehiclesHandler implements IQueryHandler<SearchVehiclesQuery, IPageable<Vehicle>> {
  @Inject(VEHICLE_REPO) protected readonly repo: IVehicleRepo;
  @Inject(VehicleFilterNormalizer) protected readonly filterNormalizer: IFilterNormalizer<VehicleFilter>;
  @InjectPinoLogger(SearchVehiclesHandler.name) protected readonly logger: PinoLogger;

  public async execute(query: SearchVehiclesQuery): Promise<IPageable<Vehicle>> {
    this.logger.info(`Executing Query "${SearchVehiclesQuery.name}"`);
    const filter = this.filterNormalizer.pageableNormalize(query);
    return this.repo.pagedAsync(filter);
  }
}

