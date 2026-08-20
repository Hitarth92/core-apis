import { IBaseRepo, Filter, PageableFilter } from '../../../common';
import { City, CityFilter } from './domain';

export type ICityRepo = IBaseRepo<City, number, PageableFilter<CityFilter, number>, Filter<CityFilter, number>>;
