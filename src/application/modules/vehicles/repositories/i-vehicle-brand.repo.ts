import { IBaseRepo } from 'src/common';
import { VehicleBrand } from '../domain';

export type IVehicleBrandRepo = IBaseRepo<VehicleBrand, string>;
