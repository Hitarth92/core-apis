import { ERole } from '../../../infrastructure/persistence/entities/role.entity';

export class AuthenticatedUser {
  /** Clerk's user ID (JWT sub) */
  clerkUserId: string;

  /** Our DB user UUID — undefined until the user has been synced via POST /auth/sync */
  dbUserId?: string;

  email?: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;

  /** Primary org UUID in our DB */
  organizationId?: string;

  /** Active Clerk org ID (from JWT org_id claim) */
  clerkOrgId?: string;

  /** Clerk org role string e.g. 'org:admin' (from JWT org_role claim) */
  clerkOrgRole?: string;

  /** Resolved DB roles from the user_roles table */
  roles: ERole[];

  /** Location IDs the user holds at least one role scoped specifically to (user_roles.locationId) */
  locationIds: string[];

  /** True if the user holds at least one org-wide role (a user_roles row with locationId null, or any org membership) */
  hasOrgWideAccess: boolean;

  /** Whether the user has been synced and exists in our DB */
  get isOnboarded(): boolean {
    return !!this.dbUserId;
  }
}
