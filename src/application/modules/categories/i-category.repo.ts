import { IBaseRepo } from '../../../common';
import { Filter, PageableFilter } from '../../../common';
import { Category } from './domain';

export interface CategoryFilter {
  name?: string;
  isActive?: boolean;
  parentId?: string | null;
  organizationId?: string;
  hasParent?: boolean;
}
export const CATEGORY_REPO = 'CATEGORY_REPO';

export type ICategoryRepo = IBaseRepo<Category, string, PageableFilter<CategoryFilter>, Filter<CategoryFilter>>;
