import { Inject, Injectable } from '@nestjs/common';
import { IOrgMemberRepo } from '../../auth/i-org-member.repo';
import { IUserRoleRepo } from '../../user-roles/i-user-role.repo';
import { ORG_MEMBER_REPO, USER_REPO, USER_ROLE_REPO } from '../../../constants';
import { IUserRepo } from '../i-user.repo';

@Injectable()
export class ErpRoleLookupService {
  public constructor(
    @Inject(USER_REPO) private readonly userRepo: IUserRepo,
    @Inject(USER_ROLE_REPO) private readonly userRoleRepo: IUserRoleRepo,
    @Inject(ORG_MEMBER_REPO) private readonly orgMemberRepo: IOrgMemberRepo,
  ) {}

  /** ERP roles from user_roles + org_members, keyed by Clerk user id. */
  public async rolesByClerkUserIds(clerkUserIds: string[]): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();
    if (!clerkUserIds.length) return result;

    const users = await this.userRepo.findByClerkIdsAsync(clerkUserIds);
    if (!users.length) return result;

    const clerkIdByUserId = new Map<string, string>();
    const userIds: string[] = [];
    for (const user of users) {
      if (!user.clerkUserId) continue;
      clerkIdByUserId.set(user.id, user.clerkUserId);
      userIds.push(user.id);
    }
    if (!userIds.length) return result;

    const rolesByUserId = new Map<string, Set<string>>();
    const addRole = (userId: string, roleName: string): void => {
      const set = rolesByUserId.get(userId) ?? new Set<string>();
      set.add(roleName);
      rolesByUserId.set(userId, set);
    };

    const [userRoleRows, orgMemberRows] = await Promise.all([
      this.userRoleRepo.roleNamesByUserIdsAsync(userIds),
      this.orgMemberRepo.roleNamesByUserIdsAsync(userIds),
    ]);
    for (const row of userRoleRows) addRole(row.userId, row.roleName);
    for (const row of orgMemberRows) addRole(row.userId, row.roleName);

    for (const [userId, clerkId] of clerkIdByUserId) {
      const names = rolesByUserId.get(userId);
      if (names?.size) result.set(clerkId, [...names]);
    }

    return result;
  }

  /** ERP roles from user_roles + org_members, keyed by local user id. */
  public async rolesByUserIds(userIds: string[]): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();
    if (!userIds.length) return result;

    const rolesByUserId = new Map<string, Set<string>>();
    const addRole = (userId: string, roleName: string): void => {
      const set = rolesByUserId.get(userId) ?? new Set<string>();
      set.add(roleName);
      rolesByUserId.set(userId, set);
    };

    const [userRoleRows, orgMemberRows] = await Promise.all([
      this.userRoleRepo.roleNamesByUserIdsAsync(userIds),
      this.orgMemberRepo.roleNamesByUserIdsAsync(userIds),
    ]);
    for (const row of userRoleRows) addRole(row.userId, row.roleName);
    for (const row of orgMemberRows) addRole(row.userId, row.roleName);

    for (const userId of userIds) {
      const names = rolesByUserId.get(userId);
      if (names?.size) result.set(userId, [...names]);
    }
    return result;
  }
}
