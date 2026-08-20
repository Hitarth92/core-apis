import { IBaseRepo } from '../../../../common';
import { VehicleExpense } from '../domain';

export type IVehicleExpenseRepo = IBaseRepo<VehicleExpense, string>;
