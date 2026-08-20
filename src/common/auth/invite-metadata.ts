import { InviteMetadata } from './i-clerk.service';

export function parseInviteMetadata(meta: unknown): InviteMetadata | undefined {
  if (!meta || typeof meta !== 'object') return undefined;
  const invite = (meta as Record<string, unknown>)['invite'];
  if (!invite || typeof invite !== 'object') return undefined;
  const rec = invite as Record<string, unknown>;
  if (typeof rec.organizationId !== 'string' || !rec.organizationId) return undefined;
  if (typeof rec.roleId !== 'string' || !rec.roleId) return undefined;
  return {
    organizationId: rec.organizationId,
    roleId: rec.roleId,
    locationId: typeof rec.locationId === 'string' && rec.locationId ? rec.locationId : undefined,
  };
}

export function locationIdIfOwnedByOrg(
  location: { organizationId: string } | null | undefined,
  organizationId: string,
  requestedLocationId?: string,
): string | undefined {
  if (!requestedLocationId) return undefined;
  if (!location) return undefined;
  if (location.organizationId !== organizationId) return undefined;
  return requestedLocationId;
}
