import { IBaseRepo } from '../../../../common';
import { Maintenance } from '../domain';

export type IMaintenanceRepo = IBaseRepo<Maintenance, string>;
