import { UserNotFoundException, UserRoleNotAllowedException } from '../../../common';
import { ERole } from '../../../infrastructure';
import { IRoleRepo } from '../roles';
import { IUserRepo } from '../users';

export async function assertRoleGrant(
  userRepo: IUserRepo,
  roleRepo: IRoleRepo,
  params: {
    userId: string;
    roleId: string;
    organizationId?: string;
    callerIsSuperAdmin: boolean;
  },
): Promise<void> {
  const targetUser = await userRepo.getAsync(params.userId);
  if (!targetUser) throw new UserNotFoundException(params.userId);

  if (!params.callerIsSuperAdmin && targetUser.organizationId !== params.organizationId) {
    throw new UserRoleNotAllowedException();
  }

  const role = await roleRepo.getAsync(params.roleId);
  if (!role || (role.name === (ERole.SuperAdmin as string) && !params.callerIsSuperAdmin)) {
    throw new UserRoleNotAllowedException();
  }
}
