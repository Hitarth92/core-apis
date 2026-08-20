import { IBaseRepo, Filter, PageableFilter } from '../../../common';
import { State, StateFilter } from './domain';

export type IStateRepo = IBaseRepo<State, number, PageableFilter<StateFilter, number>, Filter<StateFilter, number>>;
