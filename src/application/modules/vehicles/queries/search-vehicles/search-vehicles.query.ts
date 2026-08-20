import { AutoMap } from '@automapper/classes';
import { PageableFilter } from 'src/common';
import { VehicleFilter } from '../../domain';
import { ListVehiclesQuery } from '../list-vehicles/list-vehicles.query';

export class SearchVehiclesQuery extends ListVehiclesQuery implements PageableFilter<VehicleFilter> {
  @AutoMap() public $page?: number;
  @AutoMap() public $perPage?: number;
}
