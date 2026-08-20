import { IBaseRepo, Filter, PageableFilter } from '../../../common';
import { Product, ProductFilter } from './domain';

export type IProductRepo = IBaseRepo<Product, string, PageableFilter<ProductFilter>, Filter<ProductFilter>>;
