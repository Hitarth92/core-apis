import { IBaseRepo } from '../../../../common';
import { FuelTransaction } from '../domain';

export type IFuelTransactionRepo = IBaseRepo<FuelTransaction, string>;
