export function resolveInviteOrganizationId(params: {
  callerIsSuperAdmin: boolean;
  callerOrganizationId?: string;
  requestedOrganizationId?: string;
}): string | undefined {
  if (params.callerIsSuperAdmin) return params.requestedOrganizationId;
  return params.callerOrganizationId;
}
