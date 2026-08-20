import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../../../common';

/** Resolves location filter; enforces store-scoped users cannot query other locations. */
export function resolveAnalyticsLocationId(
  user: AuthenticatedUser,
  requested?: string,
): string | undefined {
  if (user.hasOrgWideAccess) {
    return requested || undefined;
  }

  const scoped = user.locationIds[0];
  if (!scoped) {
    throw new ForbiddenException('No store location assigned to your account');
  }

  if (requested && requested !== scoped) {
    throw new ForbiddenException('You do not have access to this location');
  }

  return scoped;
}
