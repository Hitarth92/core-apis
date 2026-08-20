import { IBaseRepo, Filter, PageableFilter } from '../../../common';
import { Country, CountryFilter } from './domain';

export const COUNTRY_REPO = 'COUNTRY_REPO';

export type ICountryRepo = IBaseRepo<Country, number, PageableFilter<CountryFilter, number>, Filter<CountryFilter, number>>;
