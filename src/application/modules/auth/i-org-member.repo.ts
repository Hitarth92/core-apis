import { Filter, IBaseRepo, PageableFilter } from '../../../common';
import { OrgMember } from './domain';

export type OrgMemberFilter = {
  organizationId?: string;
  userId?: string;
  status?: string;
};

export interface IOrgMemberRepo extends IBaseRepo<OrgMember, string, PageableFilter<OrgMemberFilter>, Filter<OrgMemberFilter>> {
  findByUserAndOrgAsync(userId: string, organizationId: string): Promise<OrgMember | null>;
  findByUserIdAsync(userId: string): Promise<OrgMember[]>;
  roleNamesByUserIdsAsync(userIds: string[]): Promise<Array<{ userId: string; roleName: string }>>;
}
