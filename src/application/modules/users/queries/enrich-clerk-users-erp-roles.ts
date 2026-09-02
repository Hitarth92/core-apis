import { ClerkUserListResponse, ClerkUserResponse } from '../models';
import { ErpRoleLookupService } from '../services';

export async function enrichClerkUsersWithErpRoles(
  response: ClerkUserListResponse,
  erpRoles: ErpRoleLookupService,
): Promise<ClerkUserListResponse> {
  const clerkIds = response.data.map((u) => u.clerkUserId);
  const rolesByClerkId = await erpRoles.rolesByClerkUserIds(clerkIds);
  response.data = response.data.map((user) => {
    const erp = rolesByClerkId.get(user.clerkUserId);
    if (!erp?.length) return user;
    return Object.assign(new ClerkUserResponse(), user, { roles: erp });
  });
  return response;
}
