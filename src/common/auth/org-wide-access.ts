export function computeHasOrgWideAccess(
  userRoles: { locationId?: string | null }[],
  orgMemberCount: number,
): boolean {
  if (userRoles.some((ur) => !ur.locationId)) return true;
  if (userRoles.some((ur) => ur.locationId)) return false;
  return orgMemberCount > 0;
}
