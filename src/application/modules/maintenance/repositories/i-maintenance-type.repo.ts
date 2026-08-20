import { IBaseRepo } from 'src/common';
import { MaintenanceType } from '../domain';

export type IMaintenanceTypeRepo = IBaseRepo<MaintenanceType, string>;
