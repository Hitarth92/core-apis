import { IBaseRepo, Filter, PageableFilter } from '../../../common';
import { Currency, CurrencyFilter } from './domain';

export type ICurrencyRepo = IBaseRepo<Currency, number, PageableFilter<CurrencyFilter, number>, Filter<CurrencyFilter, number>>;
