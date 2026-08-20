import { IBaseRepo } from 'src/common';
import { VehicleType } from '../domain';

export type IVehicleTypeRepo = IBaseRepo<VehicleType, string>;
