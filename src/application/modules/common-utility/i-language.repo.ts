import { IBaseRepo, Filter, PageableFilter } from '../../../common';
import { Language, LanguageFilter } from './domain';

export type ILanguageRepo = IBaseRepo<Language, number, PageableFilter<LanguageFilter, number>, Filter<LanguageFilter, number>>;
