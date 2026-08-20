import { ResourceNotOwnedByOrgException } from '../exceptions';
import { AuthenticatedUser } from './types';

export function assertOrgOwnership(user: AuthenticatedUser, resourceOrganizationId: string | null | undefined, resource: string): void {
  if (resourceOrganizationId !== user.organizationId) {
    throw new ResourceNotOwnedByOrgException(resource);
  }
}
