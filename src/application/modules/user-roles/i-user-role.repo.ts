import { IBaseRepo, Filter, PageableFilter } from '../../../common';
import { UserRole } from './domain';

export type UserRoleFilter = Record<string, never>;

export interface IUserRoleRepo extends IBaseRepo<UserRole, string, PageableFilter<UserRoleFilter>, Filter<UserRoleFilter>> {
  allByOrganizationAsync(organizationId: string): Promise<UserRole[]>;
  roleNamesByUserIdsAsync(userIds: string[]): Promise<Array<{ userId: string; roleName: string }>>;
}
