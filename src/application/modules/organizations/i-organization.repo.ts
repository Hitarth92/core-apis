import { IBaseRepo } from '../../../common';
import { Filter, PageableFilter } from '../../../common';
import { Organization } from './domain';

export interface OrganizationFilter {
  search?: string;
  isActive?: boolean;
}


export const ORGANIZATION_REPO = 'ORGANIZATION_REPO';

export type IOrganizationRepo = IBaseRepo<Organization, string, PageableFilter<OrganizationFilter>, Filter<OrganizationFilter>>;


