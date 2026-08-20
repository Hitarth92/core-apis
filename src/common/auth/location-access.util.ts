import { LocationAccessDeniedException } from '../exceptions';
import { AuthenticatedUser } from './types';

/**
 * Enforces store-scoped role assignments (user_roles.locationId). A user with an
 * org-wide role passes for any location; a user whose roles are all scoped to
 * specific locations passes only for locations in that set.
 *
 * No-op when locationId is nil — callers only invoke this where a location is
 * actually known (mirrors the existing organizationId ownership checks).
 */
export function assertLocationAccess(user: AuthenticatedUser, locationId?: string | null): void {
  if (!locationId) {
    return;
  }
  if (user.hasOrgWideAccess || user.locationIds.includes(locationId)) {
    return;
  }
  throw new LocationAccessDeniedException();
}
